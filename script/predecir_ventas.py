"""
Prediccion de ventas (6 meses) con Statsmodels (SARIMAX / ARIMA) y regresores externos.

Regresores:
  - Dolar observado (mindicador.cl serie mensual alineada)
  - IPC variacion mensual (mindicador.cl serie mensual alineada)
  - Valores actuales en macro.json como refuerzo en meses sin serie

Entradas:
  - src/assets/data/{empresa}/historico_ventas.json
  - src/assets/data/macro.json

Salida:
  - src/assets/data/{empresa}/predicciones.json

Flujo de caja (MVP): se replica la prediccion de ventas con nota de proxy hasta contar con tesoreria.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.statespace.sarimax import SARIMAX
except ImportError as e:
    print("[ERROR] Instala dependencias: pip install statsmodels pandas numpy")
    raise e

ROOT = Path("src/assets/data")
MACRO_PATH = ROOT / "macro.json"
HIST_NAME = "historico_ventas.json"
OUT_NAME = "predicciones.json"

MINDICADOR = {
    "dolar": "https://mindicador.cl/api/dolar",
    "ipc": "https://mindicador.cl/api/ipc",
}


def _get_json(url: str) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": "dashboard-fidelmira-predecir/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None


def _serie_a_mensual(api: str, campo_valor: str = "valor") -> pd.DataFrame:
    """Devuelve DataFrame con columnas periodo (yyyy-MM), valor."""
    data = _get_json(api)
    if not data or not data.get("serie"):
        return pd.DataFrame(columns=["periodo", "valor"])
    rows = []
    for pt in data["serie"]:
        fecha = pt.get("fecha")
        val = pt.get(campo_valor)
        if not fecha:
            continue
        try:
            ts = pd.to_datetime(fecha)
            periodo = ts.strftime("%Y-%m")
            v = float(val) if val is not None else np.nan
        except (TypeError, ValueError):
            continue
        rows.append((periodo, v))
    if not rows:
        return pd.DataFrame(columns=["periodo", "valor"])
    df = pd.DataFrame(rows, columns=["periodo", "valor"])
    # ultimo valor por mes
    df = df.sort_values("periodo").groupby("periodo", as_index=False).last()
    return df


def _cargar_macro() -> dict:
    if not MACRO_PATH.is_file():
        return {}
    with open(MACRO_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _merge_exog(
    periodos: list[str],
    df_dolar: pd.DataFrame,
    df_ipc: pd.DataFrame,
    macro: dict,
) -> pd.DataFrame:
    base = pd.DataFrame({"periodo": periodos})
    d = df_dolar.rename(columns={"valor": "dolar"})
    ipc = df_ipc.rename(columns={"valor": "ipc"})
    m = base.merge(d, on="periodo", how="left").merge(ipc, on="periodo", how="left")

    ind = (macro or {}).get("indicadores") or {}
    d_last = ind.get("dolar", {}).get("valor")
    ipc_last = ind.get("ipc", {}).get("variacion_mensual_pct")
    if d_last is not None:
        m["dolar"] = m["dolar"].fillna(float(d_last))
    if ipc_last is not None:
        m["ipc"] = m["ipc"].fillna(float(ipc_last))
    m["dolar"] = m["dolar"].ffill().bfill().fillna(900.0)
    m["ipc"] = m["ipc"].ffill().bfill().fillna(0.3)
    return m


def _ultimos_periodos(ultimo: str, n: int) -> list[str]:
    d = pd.Period(ultimo, freq="M")
    return [(d + i).strftime("%Y-%m") for i in range(1, n + 1)]


def _pronosticar_sarimax(
    y: np.ndarray,
    exog: np.ndarray,
    exog_futuro: np.ndarray,
    steps: int,
    seasonal_order: tuple[int, int, int, int],
    label: str,
):
    model = SARIMAX(
        y,
        exog=exog,
        order=(1, 1, 1),
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    res = model.fit(disp=False)
    fc = res.get_forecast(steps=steps, exog=exog_futuro)
    mean = np.asarray(fc.predicted_mean, dtype=float).ravel()
    ci = fc.conf_int()
    lo = np.asarray(ci.iloc[:, 0], dtype=float).ravel()
    hi = np.asarray(ci.iloc[:, 1], dtype=float).ravel()
    return mean, lo, hi, label


def _pronosticar_arima(y: np.ndarray, steps: int):
    model = ARIMA(y, order=(1, 1, 1))
    res = model.fit()
    fc = res.get_forecast(steps=steps)
    mean = np.asarray(fc.predicted_mean, dtype=float).ravel()
    ci = fc.conf_int()
    return (
        mean,
        np.asarray(ci.iloc[:, 0], dtype=float).ravel(),
        np.asarray(ci.iloc[:, 1], dtype=float).ravel(),
        "ARIMA(1,1,1)",
    )


def _fallback_lineal(y: np.ndarray, steps: int):
    n = len(y)
    x = np.arange(n)
    coef = np.polyfit(x, y, 1)
    fut_x = np.arange(n, n + steps)
    mean = np.polyval(coef, fut_x)
    err = np.std(y - np.polyval(coef, x)) * 1.96
    lo = mean - err
    hi = mean + err
    return mean, lo, hi, "tendencia_lineal+intervalo_empirico"


def predecir(empresa: str) -> bool:
    hist_path = ROOT / empresa / HIST_NAME
    out_path = ROOT / empresa / OUT_NAME

    if not hist_path.is_file():
        print(f"[WARN] No existe {hist_path}; se escribe predicciones vacias.")
        _escribir_vacio(empresa, out_path, "sin historico_ventas.json")
        return True

    with open(hist_path, "r", encoding="utf-8") as f:
        hist = json.load(f)

    serie = hist.get("serie_mensual") or []
    if len(serie) < 6:
        print(f"[WARN] Serie muy corta ({len(serie)}); se usa fallback simple.")
        _escribir_vacio(empresa, out_path, "serie insuficiente (<6 meses)")
        return True

    df = pd.DataFrame(serie)
    df["periodo"] = df["periodo"].astype(str)
    df["y"] = df["total_mes"].astype(float)
    df = df.sort_values("periodo").reset_index(drop=True)

    periodos = df["periodo"].tolist()
    y = df["y"].values

    macro = _cargar_macro()
    df_dolar = _serie_a_mensual(MINDICADOR["dolar"])
    df_ipc = _serie_a_mensual(MINDICADOR["ipc"])
    exog_df = _merge_exog(periodos, df_dolar, df_ipc, macro)
    exog = exog_df[["dolar", "ipc"]].values.astype(float)

    # Futuro: extrapolar suavemente (ultimo valor + tendencia de ultimos 3 meses)
    last_d = exog[-3:, 0]
    last_i = exog[-3:, 1]
    td = (last_d[-1] - last_d[0]) / 2.0 if len(last_d) > 1 else 0.0
    ti = (last_i[-1] - last_i[0]) / 2.0 if len(last_i) > 1 else 0.0
    fut_rows = []
    ult = periodos[-1]
    for k in range(1, 7):
        p = (pd.Period(ult, freq="M") + k).strftime("%Y-%m")
        d_val = float(exog[-1, 0] + td * k * 0.15)
        i_val = float(exog[-1, 1] + ti * k * 0.15)
        fut_rows.append([d_val, i_val])
    exog_futuro = np.array(fut_rows[:6])

    notas: list[str] = []
    modelo_nombre = ""
    mean = lo = hi = None
    fitted = False

    if len(y) >= 12:
        # Probar primero sin estacionalidad (mas estable); luego SARIMA mensual.
        for seas, label in (
            ((0, 0, 0, 0), "SARIMAX+exog (sin estacionalidad)"),
            ((1, 0, 1, 12), "SARIMAX+exog (mensual estacional 12)"),
        ):
            try:
                mean, lo, hi, modelo_nombre = _pronosticar_sarimax(
                    y, exog, exog_futuro, 6, seas, label
                )
                fitted = True
                break
            except Exception as e:
                notas.append(f"{label} fallo: {e}")

    if not fitted:
        try:
            mean, lo, hi, modelo_nombre = _pronosticar_arima(y, 6)
            fitted = True
        except Exception as e2:
            notas.append(f"ARIMA no aplico: {e2}")
            mean, lo, hi, modelo_nombre = _fallback_lineal(y, 6)

    ult_periodo = periodos[-1]
    fut_periodos = _ultimos_periodos(ult_periodo, 6)

    pron_v = [
        {
            "periodo": fut_periodos[i],
            "yhat": float(max(mean[i], 0)),
            "yhat_lower": float(max(lo[i], 0)),
            "yhat_upper": float(max(hi[i], 0)),
        }
        for i in range(min(6, len(mean)))
    ]

    hist_out = [{"periodo": p, "y": float(v)} for p, v in zip(periodos, y)]

    payload = {
        "meta": {
            "empresa": empresa,
            "generado": datetime.now().isoformat(timespec="seconds"),
            "modelo": modelo_nombre,
            "horizonte_meses": 6,
            "regresores": ["dolar_obs", "ipc_var_mensual"],
            "notas": notas
            + [
                "Regresores alineados por mes desde mindicador.cl; faltantes rellenados con macro.json.",
                "Flujo de caja (MVP): proxy igual a ventas hasta definir serie de tesoreria.",
            ],
        },
        "ventas": {
            "historico": hist_out,
            "pronostico": pron_v,
        },
        "flujo_caja": {
            "nota": "MVP: pronostico proxy copiado de ventas (definir serie real de caja).",
            "historico": hist_out,
            "pronostico": pron_v,
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[OK] {OUT_NAME} ({empresa}) modelo={modelo_nombre}")
    return True


def _escribir_vacio(empresa: str, out_path: Path, razon: str) -> None:
    payload = {
        "meta": {
            "empresa": empresa,
            "generado": datetime.now().isoformat(timespec="seconds"),
            "modelo": "ninguno",
            "error": razon,
        },
        "ventas": {"historico": [], "pronostico": []},
        "flujo_caja": {"nota": razon, "historico": [], "pronostico": []},
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    emp = sys.argv[1] if len(sys.argv) > 1 else "FIDELMIRA"
    ok = predecir(emp)
    sys.exit(0 if ok else 1)
