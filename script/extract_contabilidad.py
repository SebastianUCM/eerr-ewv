"""
Extracto contable "último pipeline" — Softland.

Por defecto: cwmovim + cwpctas (saldo acumulado hasta la fecha o movimiento en rango).

Opcional: vistas de saldo (--fuente saldo_vista | ifrs) con fallback de columnas
(ver script/sql_softland_contabilidad.py).

Uso:
  python script/extract_contabilidad.py FIDELMIRA
  python script/extract_contabilidad.py FIDELMIRA --modo movimiento --desde 2026-01-01 --hasta 2026-03-20
  python script/extract_contabilidad.py FIDELMIRA --fuente saldo_vista --hasta 2025-12-31
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import warnings
from datetime import date

import pandas as pd
import pyodbc

from sql_softland_contabilidad import (
    sql_cwmovim_por_cpb_ano_mes,
    sql_ifrs_con_fallback_cwmovim_cpb,
    sql_saldo_vista_por_ano_mes,
)

SQL_SALDO_HASTA_FECHA = """
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(m.MovDebe - m.MovHaber) AS Saldo_Actual
FROM softland.cwmovim m
INNER JOIN softland.cwpctas c ON m.PctCod = c.PCCODI
WHERE TRY_CAST(m.CpbFec AS date) IS NOT NULL
  AND TRY_CAST(m.CpbFec AS date) <= ?
GROUP BY c.PCCODI, c.PCDESC
HAVING SUM(m.MovDebe - m.MovHaber) <> 0
ORDER BY c.PCCODI
"""

SQL_MOVIMIENTO_PERIODO = """
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(m.MovDebe - m.MovHaber) AS Saldo_Actual
FROM softland.cwmovim m
INNER JOIN softland.cwpctas c ON m.PctCod = c.PCCODI
WHERE TRY_CAST(m.CpbFec AS date) IS NOT NULL
  AND TRY_CAST(m.CpbFec AS date) >= ?
  AND TRY_CAST(m.CpbFec AS date) <= ?
GROUP BY c.PCCODI, c.PCDESC
HAVING SUM(m.MovDebe - m.MovHaber) <> 0
ORDER BY c.PCCODI
"""

MODO_MOVIMIENTO = "movimiento_periodo"
MODO_SALDO_CIERRE = "saldo_hasta_fecha"

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.normpath(os.path.join(_SCRIPT_DIR, ".."))

_CENTRO_COL_CANDIDATES = [
    "CcCod",
    "CCod",
    "CodCC",
    "CodCc",
    "CentroCosto",
    "Centro_Costo",
    "Ccosto",
    "Cencos",
]
_CENTRO_DIM_TABLES = [
    "cwccos",
    "cwtccos",
    "cencos",
    "ccosto",
    "cwcentrocosto",
    "cw_cencos",
]
_CENTRO_DIM_CODE_COLS = [
    "CcCod",
    "CCod",
    "CodCC",
    "CodCc",
    "CenCod",
    "Cencos",
    "Codigo",
    "CodiCC",
]
_CENTRO_DIM_NAME_COLS = [
    "CcDes",
    "Descrip",
    "Descripcion",
    "Nombre",
    "CcNom",
    "NomCen",
    "Detalle",
    "DescCC",
]


def _schema_prefix() -> str:
    return os.getenv("SOFTLAND_SCHEMA", "softland").strip()


def _tablas_cwmovim_ref() -> str:
    p = os.getenv("SOFTLAND_TABLE_PREFIX", "").strip()
    if p:
        return f"{p}.cwmovim, {p}.cwpctas"
    sch = _schema_prefix()
    return f"{sch}.cwmovim, {sch}.cwpctas"


def _apply_schema_to_cwmovim_sql(sql: str) -> str:
    sch = _schema_prefix()
    return sql.replace("softland.", f"{sch}.")


def _read_sql_df(conn, sql: str, params: tuple | list) -> pd.DataFrame:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        return pd.read_sql(sql, conn, params=params)


def _read_df_fallback(
    conn, sql_variants: list[tuple[str, str]], params: tuple
) -> tuple[pd.DataFrame, str]:
    last = None
    for sql, label in sql_variants:
        try:
            return _read_sql_df(conn, sql, params), label
        except Exception as e:
            last = e
            continue
    raise last  # type: ignore[misc]


def _columns_for_table(conn, schema: str, table: str) -> set[str]:
    q = """
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
"""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        df = pd.read_sql(q, conn, params=(schema, table))
    return {str(x).strip() for x in df["COLUMN_NAME"].tolist()}


def _first_existing(candidates: list[str], existing: set[str]) -> str | None:
    for c in candidates:
        if c in existing:
            return c
    return None


def _all_columns(conn, schema: str) -> dict[str, set[str]]:
    q = """
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = ?
"""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        df = pd.read_sql(q, conn, params=(schema,))
    out: dict[str, set[str]] = {}
    for _, r in df.iterrows():
        t = str(r.get("TABLE_NAME", "")).strip()
        c = str(r.get("COLUMN_NAME", "")).strip()
        if not t or not c:
            continue
        out.setdefault(t, set()).add(c)
    return out


def _resolver_dimension_centros(conn, schema: str) -> tuple[str, str, str] | None:
    all_cols = _all_columns(conn, schema)
    ordered_tables = [t for t in _CENTRO_DIM_TABLES if t in all_cols] + [
        t for t in all_cols.keys() if "cenc" in t.lower() or "ccos" in t.lower()
    ]
    seen = set()
    best: tuple[int, tuple[str, str, str]] | None = None
    for table in ordered_tables:
        if table in seen:
            continue
        seen.add(table)
        cols = all_cols.get(table, set())
        code_candidates = [c for c in _CENTRO_DIM_CODE_COLS if c in cols]
        name_candidates = [c for c in _CENTRO_DIM_NAME_COLS if c in cols]
        for ccol in code_candidates:
            for ncol in name_candidates:
                try:
                    q = f"""
SELECT TOP 200
    CAST([{ccol}] AS NVARCHAR(120)) AS codigo,
    CAST([{ncol}] AS NVARCHAR(255)) AS nombre
FROM {schema}.[{table}]
WHERE NULLIF(LTRIM(RTRIM(CAST([{ccol}] AS NVARCHAR(120)))), '') IS NOT NULL
"""
                    df = _read_sql_df(conn, q, ())
                except Exception:
                    continue
                if df.empty:
                    continue
                total = 0
                distintos = 0
                no_codigo = 0
                for _, r in df.iterrows():
                    cod = str(r.get("codigo", "")).strip()
                    nom = str(r.get("nombre", "")).strip()
                    if not cod:
                        continue
                    total += 1
                    if nom and nom != cod:
                        distintos += 1
                    # Consideramos "nombre real" si tiene letras o espacios no triviales.
                    if nom and any(ch.isalpha() for ch in nom):
                        no_codigo += 1
                if total == 0:
                    continue
                score = (no_codigo * 3) + distintos
                cand = (table, ccol, ncol)
                if best is None or score > best[0]:
                    best = (score, cand)
    return best[1] if best else None


def _nombres_centros(conn, schema: str) -> dict[str, str]:
    dim = _resolver_dimension_centros(conn, schema)
    if not dim:
        return {}
    table, ccol, ncol = dim
    q = f"""
SELECT
    CAST([{ccol}] AS NVARCHAR(120)) AS codigo,
    CAST([{ncol}] AS NVARCHAR(255)) AS nombre
FROM {schema}.[{table}]
"""
    df = _read_sql_df(conn, q, ())
    out: dict[str, str] = {}
    for _, r in df.iterrows():
        cod = str(r.get("codigo", "")).strip()
        nom = str(r.get("nombre", "")).strip()
        if cod:
            out[cod] = nom or cod
    return out


def _centros_por_cuenta_cwmovim(
    conn,
    schema: str,
    modo: str,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    ano: int | None = None,
    mes: int | None = None,
    usar_cpb: bool = False,
) -> dict[str, list[dict]]:
    cols = _columns_for_table(conn, schema, "cwmovim")
    centro_col = _first_existing(_CENTRO_COL_CANDIDATES, cols)
    if not centro_col:
        return {}

    if usar_cpb:
        where_sql = "m.CpbAno = ? AND m.CpbMes = ?"
        params = (ano, mes)
    else:
        if modo == "cierre":
            where_sql = "TRY_CAST(m.CpbFec AS date) IS NOT NULL AND TRY_CAST(m.CpbFec AS date) <= ?"
            params = (fecha_hasta.isoformat() if fecha_hasta else date.today().isoformat(),)
        else:
            if not fecha_desde or not fecha_hasta:
                return {}
            where_sql = (
                "TRY_CAST(m.CpbFec AS date) IS NOT NULL AND TRY_CAST(m.CpbFec AS date) >= ? "
                "AND TRY_CAST(m.CpbFec AS date) <= ?"
            )
            params = (fecha_desde.isoformat(), fecha_hasta.isoformat())

    sql = f"""
SELECT
    m.PctCod AS Codigo,
    CAST(m.[{centro_col}] AS NVARCHAR(120)) AS CentroCodigo,
    SUM(CAST(ISNULL(m.MovDebe,0) AS FLOAT) - CAST(ISNULL(m.MovHaber,0) AS FLOAT)) AS Saldo
FROM {schema}.cwmovim m
WHERE {where_sql}
  AND NULLIF(LTRIM(RTRIM(CAST(m.[{centro_col}] AS NVARCHAR(120)))), '') IS NOT NULL
GROUP BY m.PctCod, CAST(m.[{centro_col}] AS NVARCHAR(120))
HAVING ABS(SUM(CAST(ISNULL(m.MovDebe,0) AS FLOAT) - CAST(ISNULL(m.MovHaber,0) AS FLOAT))) > 0.0001
ORDER BY m.PctCod
"""
    df = _read_sql_df(conn, sql, params)
    nombres_centros = _nombres_centros(conn, schema)
    out: dict[str, list[dict]] = {}
    for _, r in df.iterrows():
        cod = str(r.get("Codigo", "")).strip()
        cc = str(r.get("CentroCodigo", "")).strip()
        if not cod or not cc:
            continue
        out.setdefault(cod, []).append(
            {
                "codigo": cc,
                "nombre": nombres_centros.get(cc, cc),
                "saldo": float(r.get("Saldo", 0) or 0),
            }
        )
    return out


def extraer(
    db_name: str,
    modo: str = "cierre",
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    fuente: str = "cwmovim",
    norma: str = "nch",
    alcance: str = "individual",
) -> bool:
    server = os.getenv("SOFTLAND_SQL_SERVER", "172.16.40.16")
    user = os.getenv("SOFTLAND_SQL_USER", "consulta")
    password = os.getenv("SOFTLAND_SQL_PASSWORD", "")

    conn_str = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={db_name};"
        f"UID={user};"
        f"PWD={password};"
        f"TrustServerCertificate=yes;"
    )

    modo = (modo or "cierre").lower().strip()
    fuente = (fuente or "cwmovim").lower().strip()
    norma = (norma or "nch").lower().strip()
    alcance = (alcance or "individual").lower().strip()

    if fuente == "ifrs":
        norma = "ifrs"

    sch = _schema_prefix()

    try:
        with pyodbc.connect(conn_str) as conn:
            centros_por_cuenta: dict[str, list[dict]] = {}
            if fuente == "cwmovim":
                if modo == "cierre":
                    hasta = fecha_hasta or date.today()
                    query = _apply_schema_to_cwmovim_sql(SQL_SALDO_HASTA_FECHA)
                    params = (hasta.isoformat(),)
                    modo_softland = MODO_SALDO_CIERRE
                    meta_desde = None
                    meta_hasta = hasta.isoformat()
                    tablas_ref = f"{sch}.cwmovim, {sch}.cwpctas"
                elif modo == "movimiento":
                    if not fecha_desde or not fecha_hasta:
                        print("[ERROR] modo movimiento requiere --desde y --hasta")
                        return False
                    query = _apply_schema_to_cwmovim_sql(SQL_MOVIMIENTO_PERIODO)
                    params = (fecha_desde.isoformat(), fecha_hasta.isoformat())
                    modo_softland = MODO_MOVIMIENTO
                    meta_desde = fecha_desde.isoformat()
                    meta_hasta = fecha_hasta.isoformat()
                    tablas_ref = f"{sch}.cwmovim, {sch}.cwpctas"
                else:
                    print(f"[ERROR] modo debe ser cierre o movimiento (recibido: {modo!r})")
                    return False
                df = _read_sql_df(conn, query, params)
                centros_por_cuenta = _centros_por_cuenta_cwmovim(
                    conn, sch, modo, fecha_desde, fecha_hasta
                )
            elif fuente == "saldo_vista":
                hasta = fecha_hasta or date.today()
                ano, mes = hasta.year, hasta.month
                vari = sql_saldo_vista_por_ano_mes()
                sql_variants = [(v[0], v[1]) for v in vari]
                df, _var_label = _read_df_fallback(conn, sql_variants, (ano, mes))
                modo_softland = MODO_SALDO_CIERRE
                meta_desde = None
                meta_hasta = hasta.isoformat()
                tablas_ref = f"{sch}.CW_vsnpSaldoCuenta, {sch}.cwpctas"
            elif fuente == "ifrs":
                hasta = fecha_hasta or date.today()
                ano, mes = hasta.year, hasta.month
                vari = sql_ifrs_con_fallback_cwmovim_cpb()
                sql_variants = [(v[0], v[1]) for v in vari]
                df, var_label = _read_df_fallback(conn, sql_variants, (ano, mes))
                if "cwmovim.CpbAno" in var_label:
                    modo_softland = MODO_MOVIMIENTO
                    tablas_ref = f"{sch}.CW_vsnpSalCtaIFRS o {_tablas_cwmovim_ref()}"
                else:
                    modo_softland = MODO_SALDO_CIERRE
                    tablas_ref = f"{sch}.CW_vsnpSalCtaIFRS, {sch}.cwpctas"
                meta_desde = None
                meta_hasta = hasta.isoformat()
            elif fuente == "cwmovim_cpb":
                hasta = fecha_hasta or date.today()
                ano, mes = hasta.year, hasta.month
                vari = sql_cwmovim_por_cpb_ano_mes()
                sql_variants = [(v[0], v[1]) for v in vari]
                df, _var_label = _read_df_fallback(conn, sql_variants, (ano, mes))
                modo_softland = MODO_MOVIMIENTO
                meta_desde = None
                meta_hasta = hasta.isoformat()
                tablas_ref = _tablas_cwmovim_ref()
                centros_por_cuenta = _centros_por_cuenta_cwmovim(
                    conn, sch, modo="movimiento", fecha_desde=None, fecha_hasta=None, ano=ano, mes=mes, usar_cpb=True
                )
            else:
                print(
                    f"[ERROR] --fuente debe ser cwmovim|saldo_vista|ifrs|cwmovim_cpb "
                    f"(recibido: {fuente!r})"
                )
                return False

        folder = os.path.join(_PROJECT_ROOT, "src", "assets", "data", db_name)
        os.makedirs(folder, exist_ok=True)

        salida = os.path.join(folder, "contabilidad.json")
        cuentas_records = df.to_dict(orient="records")
        if 'centros_por_cuenta' in locals() and centros_por_cuenta:
            for rec in cuentas_records:
                codigo = str(rec.get("Codigo", "")).strip()
                rec["centros"] = centros_por_cuenta.get(codigo, [])

        payload = {
            "meta": {
                "empresa": db_name,
                "fecha_desde": meta_desde,
                "fecha_hasta": meta_hasta,
                "modo_softland": modo_softland,
                "fuente_datos": fuente,
                "norma": norma,
                "alcance": alcance,
                "tablas_softland": tablas_ref,
                "solo_lectura_sql": True,
            },
            "cuentas": cuentas_records,
        }
        with open(salida, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=4)

        print(f"[OK] Datos contables ({modo_softland}, fuente={fuente}) de {db_name} en {salida}")
        return True
    except Exception as e:
        print(f"[ERROR] contabilidad ({db_name}): {e}")
        print(
            "[HINT] Revisa columnas: SELECT TOP 5 * FROM "
            f"{sch}.CW_vsnpSaldoCuenta / CW_vsnpSalCtaIFRS"
        )
        return False


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Extracto contabilidad Softland")
    p.add_argument("empresa", nargs="?", default="FIDELMIRA", help="Base de datos")
    p.add_argument(
        "--fuente",
        choices=("cwmovim", "saldo_vista", "ifrs", "cwmovim_cpb"),
        default="cwmovim",
        help="cwmovim | saldo_vista | ifrs (vista + fallback Cpb) | cwmovim_cpb",
    )
    p.add_argument(
        "--modo",
        choices=("cierre", "movimiento"),
        default="cierre",
        help="Solo --fuente cwmovim: cierre o movimiento en rango",
    )
    p.add_argument("--desde", default=None, help="YYYY-MM-DD (modo movimiento cwmovim)")
    p.add_argument(
        "--hasta",
        default=None,
        help="YYYY-MM-DD (corte; para vistas año/mes se toma de esta fecha)",
    )
    p.add_argument(
        "--norma",
        choices=("nch", "ifrs"),
        default="nch",
        help="Metadato (ifrs si --fuente ifrs)",
    )
    p.add_argument(
        "--alcance",
        choices=("individual", "consolidado"),
        default="individual",
        help="Metadato alcance",
    )
    args = p.parse_args()

    fd = date.fromisoformat(args.desde) if args.desde else None
    fh = date.fromisoformat(args.hasta) if args.hasta else None

    norma = args.norma
    if args.fuente == "ifrs":
        norma = "ifrs"

    ok = extraer(
        args.empresa,
        modo=args.modo,
        fecha_desde=fd,
        fecha_hasta=fh,
        fuente=args.fuente,
        norma=norma,
        alcance=args.alcance,
    )
    sys.exit(0 if ok else 1)
