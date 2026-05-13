"""
Extrae indicadores macro de Chile desde mindicador.cl (solo lectura HTTP)
y construye macro.json con snapshot actual + histórico mensual consolidado
(1 punto por mes) desde 2013.

Salida:
  src/assets/config/macro.json

Uso (desde raíz del repo):
  python src/assets/config/extract_macro_historico.py
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

START_YEAR = 2013
CONFIG_DIR = Path(__file__).resolve().parent
OUT_PATH = CONFIG_DIR / "macro.json"

INDICADORES = {
    "uf": "https://mindicador.cl/api/uf",
    "dolar": "https://mindicador.cl/api/dolar",
    "ipc": "https://mindicador.cl/api/ipc",
}


def _get_json(url: str, timeout: int = 30) -> dict[str, Any] | None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "dashboard-fidelmira-macro-historico/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        print(f"[WARN] Error consultando {url}: {e}")
        return None


def _iso_to_datetime(s: str | None) -> datetime | None:
    if not s or not isinstance(s, str):
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _last_value(serie: list[dict[str, Any]]) -> tuple[float | None, str | None]:
    if not serie:
        return None, None
    last = serie[-1]
    try:
        val = float(last.get("valor")) if last.get("valor") is not None else None
    except (TypeError, ValueError):
        val = None
    fecha = last.get("fecha") if isinstance(last.get("fecha"), str) else None
    return val, fecha


def _historico_mensual_un_punto(codigo: str, fecha_corte: date) -> list[dict[str, Any]]:
    """
    Devuelve 1 punto por mes (último dato del mes), desde START_YEAR hasta fecha_corte.
    """
    mensual: dict[tuple[int, int], dict[str, Any]] = {}
    current_year = fecha_corte.year

    for year in range(START_YEAR, current_year + 1):
        url = f"https://mindicador.cl/api/{codigo}/{year}"
        data = _get_json(url)
        if not data:
            continue

        serie = data.get("serie") or []
        for p in serie:
            dt = _iso_to_datetime(p.get("fecha"))
            if not dt:
                continue
            d = dt.date()
            if d.year < START_YEAR or d > fecha_corte:
                continue

            try:
                valor = float(p.get("valor"))
            except (TypeError, ValueError):
                continue

            key = (d.year, d.month)
            prev = mensual.get(key)

            # Conserva el punto más reciente del mes
            if prev is None:
                mensual[key] = {
                    "fecha": p.get("fecha"),
                    "anio": d.year,
                    "mes": d.month,
                    "valor": valor,
                    "_dt": dt,
                }
            else:
                if dt > prev["_dt"]:
                    mensual[key] = {
                        "fecha": p.get("fecha"),
                        "anio": d.year,
                        "mes": d.month,
                        "valor": valor,
                        "_dt": dt,
                    }

    out = list(mensual.values())
    out.sort(key=lambda x: (x["anio"], x["mes"]))

    # limpiar campo interno
    for p in out:
        p.pop("_dt", None)

    return out


def main() -> int:
    fecha_hoy = datetime.now(timezone.utc).date()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    indicadores_snapshot: dict[str, Any] = {}
    historico: dict[str, list[dict[str, Any]]] = {}
    errores_snapshot: list[str] = []
    errores_historico: list[str] = []

    for codigo, url in INDICADORES.items():
        # Snapshot actual
        data = _get_json(url)
        if data:
            serie = data.get("serie") or []
            valor, fecha = _last_value(serie)
            entry = {
                "nombre": data.get("nombre") or codigo.upper(),
                "unidad_medida": data.get("unidad_medida"),
                "valor": valor,
                "fecha": fecha,
            }
            if codigo == "ipc":
                try:
                    entry["variacion_mensual_pct"] = float(valor) if valor is not None else None
                except (TypeError, ValueError):
                    entry["variacion_mensual_pct"] = None
            indicadores_snapshot[codigo] = entry
        else:
            errores_snapshot.append(codigo)

        # Histórico mensual consolidado (1 punto/mes)
        hist = _historico_mensual_un_punto(codigo, fecha_hoy)
        if hist:
            historico[codigo] = hist
        else:
            historico[codigo] = []
            errores_historico.append(codigo)

    payload = {
        "meta": {
            "actualizado_utc": datetime.now(timezone.utc).isoformat(),
            "fuente": "https://mindicador.cl",
            "solo_lectura_http": True,
            "rango_historico": {
                "desde_anio": START_YEAR,
                "hasta_fecha_utc": fecha_hoy.isoformat(),
                "granularidad": "mensual_ultimo_dato",
            },
        },
        "indicadores": indicadores_snapshot,  # compatibilidad con tu estructura actual
        "historico": historico,               # nuevo bloque histórico mensual
    }

    advertencias: list[str] = []
    if errores_snapshot:
        advertencias.append(f"snapshot faltante: {', '.join(errores_snapshot)}")
    if errores_historico:
        advertencias.append(f"historico faltante: {', '.join(errores_historico)}")
    if advertencias:
        payload["meta"]["advertencia"] = " | ".join(advertencias)

    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[OK] macro.json generado en: {OUT_PATH}")
    for k, serie in historico.items():
        print(f"   - {k}: {len(serie)} meses")
    return 0


if __name__ == "__main__":
    sys.exit(main())