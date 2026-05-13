"""
Exporta indicadores financieros anuales a CSV leyendo datos_vue.json y mapeos.

Criterios alineados con DashboardEERR (KPIs por mapeo_cuentas) y BalanceTributario /
kpiActivosDeudaEbitda (árbol de balance, deuda por mapeo_deuda, ratio deuda/EBITDA).

No modifica otros archivos del proyecto: solo lee JSON y escribe el CSV de salida.

Uso (desde la raíz del repo):
  python src/assets/config/export_indicadores_csv.py

Salida por defecto: src/assets/config/indicadores.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import pandas as pd
except ImportError as e:
    print("Se requiere pandas (pip install pandas).", file=sys.stderr)
    raise SystemExit(1) from e

CONFIG_DIR = Path(__file__).resolve().parent
ASSETS_DIR = CONFIG_DIR.parent

DEFAULT_DATOS = ASSETS_DIR / "datos_vue.json"
DEFAULT_PLAN = ASSETS_DIR / "plan_cuentas.json"
DEFAULT_MAPEO_CUENTAS = CONFIG_DIR / "mapeo_cuentas.json"
DEFAULT_MAPEO_DEUDA = CONFIG_DIR / "mapeo_deuda.json"
DEFAULT_SALIDA = CONFIG_DIR / "indicadores.csv"

CATEGORIA_EXCLUIDA_EBITDA = "otros_gastos_financieros"


def norm_anio(v: Any) -> int:
    return int(v)


def norm_mes(v: Any) -> int:
    n = int(v) if str(v).strip().isdigit() else 0
    if 1 <= n <= 12:
        return n
    x = int(str(v or "").strip().lstrip("0") or "0")
    return x if 1 <= x <= 12 else 1


def codigo_sort_key(cod: str) -> tuple:
    parts = re.split(r"(\d+)", str(cod))
    out: list[Any] = []
    for p in parts:
        if not p:
            continue
        if p.isdigit():
            out.append(int(p))
        else:
            out.append(p)
    return tuple(out)


def cargar_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def filas_mapeadas(
    df: pd.DataFrame, empresa: str, anio: int, map_cuentas: dict[str, dict[str, Any]]
) -> pd.DataFrame:
    """Filas del año con cuenta presente en mapeo_cuentas (misma lógica que DashboardEERR)."""
    e = str(empresa).strip()
    sub = df[
        (df["Empresa"].astype(str).str.strip() == e)
        & (pd.to_numeric(df["Anio"], errors="coerce").fillna(-1).astype(int) == int(anio))
    ].copy()
    if sub.empty:
        return sub
    codigos = sub["CodigoCuenta"].astype(str).str.strip()
    cfg_series = codigos.map(lambda c: map_cuentas.get(c))
    mask = cfg_series.notna()
    sub = sub.loc[mask].copy()
    sub["_cfg"] = cfg_series.loc[mask]
    sub["Categoria"] = sub["_cfg"].map(lambda x: x["categoria"])
    sub["Subitem"] = sub["_cfg"].map(lambda x: x.get("subitem") or "sin_subitem")
    sub["Mes"] = sub["Mes"].map(norm_mes)
    sub["SaldoNeto"] = pd.to_numeric(sub["SaldoNeto"], errors="coerce").fillna(0.0)
    sub.drop(columns=["_cfg"], inplace=True)
    return sub


def kpis_eerr(mapped: pd.DataFrame) -> dict[str, float]:
    ingresos = gastos = resultado = 0.0
    ingresos_financieros = contribuciones = patente = 0.0
    ingreso_explotacion = gasto_adm = remuneraciones = 0.0

    for _, d in mapped.iterrows():
        saldo = float(d["SaldoNeto"])
        cat = d["Categoria"]
        sub = d["Subitem"]

        resultado += saldo
        if cat in ("ingreso_explotacion", "ingreso_financiero"):
            ingresos += saldo
        else:
            gastos += saldo

        if cat == "ingreso_financiero":
            ingresos_financieros += saldo
        if sub == "impuestos_y_contribuciones":
            contribuciones += saldo
        if sub == "patentes":
            patente += saldo
        if cat == "ingreso_explotacion":
            ingreso_explotacion += saldo
        if cat == "gasto_adm_ventas":
            gasto_adm += saldo
        if sub == "remuneraciones":
            remuneraciones += saldo

    ebitda = 0.0
    for _, d in mapped.iterrows():
        cat = d["Categoria"]
        saldo = float(d["SaldoNeto"])
        es_ing = cat in ("ingreso_explotacion", "ingreso_financiero")
        es_otros_gf = cat == CATEGORIA_EXCLUIDA_EBITDA
        es_gav = cat == "gasto_adm_ventas"
        if not es_otros_gf and (es_ing or es_gav):
            ebitda += saldo

    margen_bruto = ingreso_explotacion + (gasto_adm - remuneraciones)

    return {
        "ingresos_acumulados": ingresos,
        "gastos_acumulados": gastos,
        "ebitda": ebitda,
        "margen_bruto": margen_bruto,
        "resultado_ejercicio": resultado,
        "contribuciones": contribuciones,
        "patente_municipal": patente,
        "ingresos_financieros": ingresos_financieros,
    }


def construir_arbol_balance(
    empresa: str,
    anio: int,
    mes_hasta: int,
    norma: str,
    df: pd.DataFrame,
    plan_empresa: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Réplica de kpiActivosDeudaEbitda.construirArbolBalance (norma Trib o IFRS)."""
    e = str(empresa).strip()
    datos_emp = df[df["Empresa"].astype(str).str.strip() == e]

    def match_norma(row: pd.Series) -> bool:
        if norma.upper() == "IFRS":
            return str(row.get("NormaIFRS", "")).strip() == "S"
        return str(row.get("NormaTrib", "")).strip() == "S"

    movs = datos_emp[
        (pd.to_numeric(datos_emp["Anio"], errors="coerce").fillna(-1).astype(int) == int(anio))
        & (datos_emp["Mes"].map(norm_mes) <= int(mes_hasta))
    ]
    movs = movs[movs.apply(match_norma, axis=1)]

    dict_nodos: dict[str, dict[str, Any]] = {}

    for c in plan_empresa:
        cod = c["CodigoCuenta"]
        dict_nodos[cod] = {
            "codigo": cod,
            "nombre": str(c.get("NombreCuenta", "")).strip(),
            "nivel": int(c.get("NivelCuenta") or 1),
            "prefijo": cod[: int(c.get("LongitudCodigo") or 0)],
            "debitos": 0.0,
            "creditos": 0.0,
            "hijos": [],
            "esHoja": True,
        }

    for _, m in movs.iterrows():
        cc = m["CodigoCuenta"]
        if cc not in dict_nodos:
            dict_nodos[cc] = {
                "codigo": cc,
                "nombre": str(m.get("NombreCuenta", "")).strip(),
                "nivel": 5,
                "prefijo": cc,
                "debitos": 0.0,
                "creditos": 0.0,
                "hijos": [],
                "esHoja": True,
            }
        dict_nodos[cc]["debitos"] += float(m.get("TotalDebe") or 0)
        dict_nodos[cc]["creditos"] += float(m.get("TotalHaber") or 0)

    nodos_array = sorted(dict_nodos.values(), key=lambda n: codigo_sort_key(n["codigo"]))
    raices: list[dict[str, Any]] = []

    for idx, nodo in enumerate(nodos_array):
        padre = None
        for i in range(idx - 1, -1, -1):
            candidato = nodos_array[i]
            if candidato["nivel"] < nodo["nivel"] and str(nodo["codigo"]).startswith(
                str(candidato["prefijo"])
            ):
                padre = candidato
                break
        if padre:
            padre["hijos"].append(nodo)
            padre["esHoja"] = False
        else:
            raices.append(nodo)

    def procesar_nodo(nodo: dict[str, Any]) -> dict[str, float]:
        sum_debe = float(nodo["debitos"])
        sum_haber = float(nodo["creditos"])
        sum_saldo_deudor = 0.0
        sum_saldo_acreedor = 0.0
        sum_activo = 0.0
        sum_pasivo = 0.0
        sum_perdida = 0.0
        sum_ganancia = 0.0

        if sum_debe > sum_haber:
            sum_saldo_deudor = sum_debe - sum_haber
        if sum_haber > sum_debe:
            sum_saldo_acreedor = sum_haber - sum_debe

        prefix = str(nodo["codigo"])[0] if nodo["codigo"] else ""
        if prefix == "1":
            sum_activo = sum_saldo_deudor
            sum_pasivo = sum_saldo_acreedor
        elif prefix in ("2", "3"):
            sum_pasivo = sum_saldo_acreedor
            sum_activo = sum_saldo_deudor
        elif prefix == "4":
            sum_ganancia = sum_saldo_acreedor
            sum_perdida = sum_saldo_deudor
        elif prefix == "5":
            sum_perdida = sum_saldo_deudor
            sum_ganancia = sum_saldo_acreedor
        else:
            sum_ganancia = sum_saldo_acreedor
            sum_perdida = sum_saldo_deudor

        for hijo in nodo["hijos"]:
            vals = procesar_nodo(hijo)
            sum_debe += vals["debe"]
            sum_haber += vals["haber"]
            sum_saldo_deudor += vals["saldoDeudor"]
            sum_saldo_acreedor += vals["saldoAcreedor"]
            sum_activo += vals["activo"]
            sum_pasivo += vals["pasivo"]
            sum_perdida += vals["perdida"]
            sum_ganancia += vals["ganancia"]

        if prefix == "1":
            sum_saldo_cuentas = sum_activo - sum_pasivo - sum_perdida + sum_ganancia
        else:
            sum_saldo_cuentas = -sum_activo + sum_pasivo - sum_perdida + sum_ganancia

        nodo.update(
            {
                "debitos": sum_debe,
                "creditos": sum_haber,
                "saldoDeudor": sum_saldo_deudor,
                "saldoAcreedor": sum_saldo_acreedor,
                "activo": sum_activo,
                "pasivo": sum_pasivo,
                "perdida": sum_perdida,
                "ganancia": sum_ganancia,
                "saldoCuentas": sum_saldo_cuentas,
            }
        )
        return {
            "debe": sum_debe,
            "haber": sum_haber,
            "saldoDeudor": sum_saldo_deudor,
            "saldoAcreedor": sum_saldo_acreedor,
            "activo": sum_activo,
            "pasivo": sum_pasivo,
            "perdida": sum_perdida,
            "ganancia": sum_ganancia,
            "saldoCuentas": sum_saldo_cuentas,
        }

    for r in raices:
        procesar_nodo(r)
    return raices


def totales_globales(raices: list[dict[str, Any]]) -> dict[str, float]:
    t = {
        "debitos": 0.0,
        "creditos": 0.0,
        "saldoDeudor": 0.0,
        "saldoAcreedor": 0.0,
        "activo": 0.0,
        "pasivo": 0.0,
        "perdida": 0.0,
        "ganancia": 0.0,
        "saldoCuentas": 0.0,
    }
    for r in raices:
        t["debitos"] += float(r.get("debitos") or 0)
        t["creditos"] += float(r.get("creditos") or 0)
        t["saldoDeudor"] += float(r.get("saldoDeudor") or 0)
        t["saldoAcreedor"] += float(r.get("saldoAcreedor") or 0)
        t["activo"] += float(r.get("activo") or 0)
        t["pasivo"] += float(r.get("pasivo") or 0)
        t["perdida"] += float(r.get("perdida") or 0)
        t["ganancia"] += float(r.get("ganancia") or 0)
        t["saldoCuentas"] += float(r.get("saldoCuentas") or 0)
    return t


def sumar_saldo_cuenta_mapeado(raices: list[dict[str, Any]], codigos: set[str]) -> float:
    if not codigos:
        return 0.0
    suma = 0.0

    def walk(nodos: list[dict[str, Any]]) -> None:
        nonlocal suma
        for n in nodos:
            if str(n["codigo"]).strip() in codigos:
                suma += float(n.get("saldoCuentas") or 0)
            if n.get("hijos"):
                walk(n["hijos"])

    walk(raices)
    return suma


def pct_crecimiento(actual: float | None, anterior: float | None) -> str | float:
    if anterior is None or actual is None:
        return ""
    if anterior == 0:
        return ""
    return (float(actual) - float(anterior)) / abs(float(anterior))


def main() -> None:
    p = argparse.ArgumentParser(description="Exporta indicadores.csv desde datos_vue.json")
    p.add_argument("--datos", type=Path, default=DEFAULT_DATOS)
    p.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    p.add_argument("--mapeo-cuentas", type=Path, default=DEFAULT_MAPEO_CUENTAS)
    p.add_argument("--mapeo-deuda", type=Path, default=DEFAULT_MAPEO_DEUDA)
    p.add_argument("--salida", type=Path, default=DEFAULT_SALIDA)
    p.add_argument("--norma", choices=("Trib", "IFRS"), default="Trib")
    p.add_argument("--mes-cierre", type=int, default=12, help="Mes acumulado para balance (1-12)")
    args = p.parse_args()

    print("Cargando datos_vue.json (puede tardar)...", file=sys.stderr)
    df = pd.read_json(args.datos, orient="records")
    plan_raw = cargar_json(args.plan)
    mapeo_cuentas_raw = cargar_json(args.mapeo_cuentas)
    mapeo_deuda_raw = cargar_json(args.mapeo_deuda)

    empresas_cfg = mapeo_cuentas_raw.get("empresas") or {}
    empresas_datos = sorted(df["Empresa"].astype(str).str.strip().unique().tolist())
    empresas = sorted(set(empresas_cfg.keys()) | set(empresas_datos))

    mes_cierre = max(1, min(12, int(args.mes_cierre)))

    filas_out: list[dict[str, Any]] = []

    for empresa in empresas:
        map_cuentas = (empresas_cfg.get(empresa) or {}).get("cuentas") or {}
        plan_emp = [x for x in plan_raw if str(x.get("Empresa", "")).strip() == str(empresa).strip()]

        deuda_list = (mapeo_deuda_raw.get("empresas") or {}).get(empresa) or {}
        codigos_deuda = set(
            str(c).strip() for c in (deuda_list.get("cuentas_deuda_total") or []) if str(c).strip()
        )

        sub = df[df["Empresa"].astype(str).str.strip() == str(empresa).strip()]
        anios = sorted(
            {int(x) for x in pd.to_numeric(sub["Anio"], errors="coerce").dropna().astype(int).unique()}
        )

        for anio in anios:
            mapped = filas_mapeadas(df, empresa, anio, map_cuentas)
            k = kpis_eerr(mapped) if not mapped.empty else {
                "ingresos_acumulados": 0.0,
                "gastos_acumulados": 0.0,
                "ebitda": 0.0,
                "margen_bruto": 0.0,
                "resultado_ejercicio": 0.0,
                "contribuciones": 0.0,
                "patente_municipal": 0.0,
                "ingresos_financieros": 0.0,
            }

            raices = construir_arbol_balance(
                empresa, anio, mes_cierre, args.norma, df, plan_emp
            )
            tg = totales_globales(raices)
            deuda_total = sumar_saldo_cuenta_mapeado(raices, codigos_deuda)

            res_balance = tg["ganancia"] - tg["perdida"]
            ebitda = k["ebitda"]
            ratio = ""
            if codigos_deuda and ebitda > 0:
                r = deuda_total / ebitda
                ratio = r if abs(r) != float("inf") else ""

            filas_out.append(
                {
                    "empresa": empresa,
                    "anio": anio,
                    "ingresos_acumulados": k["ingresos_acumulados"],
                    "gastos_acumulados": k["gastos_acumulados"],
                    "ebitda": k["ebitda"],
                    "margen_bruto": k["margen_bruto"],
                    "resultado_ejercicio": k["resultado_ejercicio"],
                    "contribuciones": k["contribuciones"],
                    "patente_municipal": k["patente_municipal"],
                    "ingresos_financieros": k["ingresos_financieros"],
                    "deuda_total": deuda_total,
                    "debitos_acumulados": tg["debitos"],
                    "creditos_acumulados": tg["creditos"],
                    "saldo_deudor": tg["saldoDeudor"],
                    "saldo_acreedor": tg["saldoAcreedor"],
                    "inventario_activo": tg["activo"],
                    "inventario_pasivo": tg["pasivo"],
                    "resultado_perdida": tg["perdida"],
                    "resultado_ganancia": tg["ganancia"],
                    "analisis_saldo_cuenta_total": tg["saldoCuentas"],
                    "resultado_ejercicio_balance": res_balance,
                    "total_general_saldo_cuenta": tg["saldoCuentas"],
                    "ratio_deuda_total_sobre_ebitda": ratio,
                }
            )

    # Orden estable: empresa, año
    filas_out.sort(key=lambda r: (str(r["empresa"]), int(r["anio"])))

    # YoY por empresa
    metricas_yoy = [
        "ingresos_acumulados",
        "gastos_acumulados",
        "ebitda",
        "margen_bruto",
        "resultado_ejercicio",
        "contribuciones",
        "patente_municipal",
        "ingresos_financieros",
        "deuda_total",
        "debitos_acumulados",
        "creditos_acumulados",
        "saldo_deudor",
        "saldo_acreedor",
        "inventario_activo",
        "inventario_pasivo",
        "resultado_perdida",
        "resultado_ganancia",
        "analisis_saldo_cuenta_total",
        "resultado_ejercicio_balance",
        "total_general_saldo_cuenta",
    ]

    por_emp: dict[str, list[dict[str, Any]]] = {}
    for row in filas_out:
        por_emp.setdefault(str(row["empresa"]), []).append(row)

    for emp, rows in por_emp.items():
        by_anio = {int(r["anio"]): r for r in rows}
        for r in rows:
            a = int(r["anio"])
            prev = by_anio.get(a - 1)
            for m in metricas_yoy:
                col = f"crecimiento_pct_{m}_vs_anio_anterior"
                r[col] = pct_crecimiento(r.get(m), prev.get(m) if prev else None)
            pe = prev.get("ratio_deuda_total_sobre_ebitda") if prev else None
            ce = r.get("ratio_deuda_total_sobre_ebitda")
            r["crecimiento_pct_ratio_deuda_sobre_ebitda_vs_anio_anterior"] = pct_crecimiento(
                float(ce) if ce != "" and ce is not None else None,
                float(pe) if pe != "" and pe is not None else None,
            )

    columnas = [
        "empresa",
        "anio",
        "ingresos_acumulados",
        "gastos_acumulados",
        "ebitda",
        "margen_bruto",
        "resultado_ejercicio",
        "contribuciones",
        "patente_municipal",
        "ingresos_financieros",
        "deuda_total",
        "debitos_acumulados",
        "creditos_acumulados",
        "saldo_deudor",
        "saldo_acreedor",
        "inventario_activo",
        "inventario_pasivo",
        "resultado_perdida",
        "resultado_ganancia",
        "analisis_saldo_cuenta_total",
        "resultado_ejercicio_balance",
        "total_general_saldo_cuenta",
        "ratio_deuda_total_sobre_ebitda",
    ] + [f"crecimiento_pct_{m}_vs_anio_anterior" for m in metricas_yoy] + [
        "crecimiento_pct_ratio_deuda_sobre_ebitda_vs_anio_anterior"
    ]

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    with args.salida.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columnas, extrasaction="ignore")
        w.writeheader()
        for row in filas_out:
            w.writerow({k: row.get(k, "") for k in columnas})

    print(f"Escrito: {args.salida} ({len(filas_out)} filas)", file=sys.stderr)


if __name__ == "__main__":
    main()
