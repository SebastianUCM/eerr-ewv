"""
Snapshot contable por rango de fechas — SOLO LECTURA (SELECT únicamente).

Fuentes (--fuente):
  cwmovim       Movimientos en softland.cwmovim + cwpctas (modo movimiento/cierre).
  saldo_vista   Vista softland.CW_vsnpSaldoCuenta (foto de saldos; intenta Ano/Mes o CpbAno/CpbMes).
  ifrs          Intenta CW_vsnpSalCtaIFRS; si falla, fallback a cwmovim por CpbAno/CpbMes (como Snowflake).
  cwmovim_cpb   Solo cwmovim filtrado por CpbAno/CpbMes (neto MovDebe-MovHaber del periodo).

Modos (--modo, solo fuente cwmovim):
  movimiento    Variación entre fecha_desde y fecha_hasta.
  cierre        Saldo acumulado hasta fecha_hasta.

Norma / alcance (--norma nch|ifrs, --alcance individual|consolidado):
  Metadatos en JSON; el SQL de consolidado puede requerir otra vista en tu BD (ajusta sql_softland_contabilidad.py).

Variables de entorno:
  SOFTLAND_SQL_SERVER, SOFTLAND_SQL_USER, SOFTLAND_SQL_PASSWORD
  SOFTLAND_SCHEMA   (default: softland)
  SOFTLAND_TABLE_PREFIX  Opcional: p.ej. BACKUP_EMPRESAS.FIDELMIRA para FROM prefijo.cwmovim
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

# Variación neta del periodo [desde, hasta].
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
    """Referencia legible para meta (respeta SOFTLAND_TABLE_PREFIX)."""
    p = os.getenv("SOFTLAND_TABLE_PREFIX", "").strip()
    if p:
        return f"{p}.cwmovim, {p}.cwpctas"
    return f"{_schema_prefix()}.cwmovim, {_schema_prefix()}.cwpctas"


def _apply_schema_to_cwmovim_sql(sql: str) -> str:
    """Reemplaza 'softland.' por el esquema configurado en SQL embebidos cwmovim."""
    sch = _schema_prefix()
    return sql.replace("softland.", f"{sch}.")


def _conn_str(db_name: str) -> str:
    server = os.getenv("SOFTLAND_SQL_SERVER", "172.16.40.16")
    user = os.getenv("SOFTLAND_SQL_USER", "consulta")
    password = os.getenv("SOFTLAND_SQL_PASSWORD", "")
    return (
        f"DRIVER={{SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={db_name};"
        f"UID={user};"
        f"PWD={password};"
        f"TrustServerCertificate=yes;"
    )


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


def _asegurar_index(historico_dir: str, db_name: str) -> None:
    index_path = os.path.join(historico_dir, "index.json")
    if os.path.isfile(index_path):
        return
    os.makedirs(historico_dir, exist_ok=True)
    data = {
        "empresa": db_name,
        "nota": "Snapshots contables. Ver extract_contabilidad_snapshot.py y public/docs/contabilidad_softland.md",
        "snapshots": [
            {
                "id": "live",
                "label": "Último extracto (pipeline actual)",
                "archivo": "../contabilidad.json",
            },
        ],
    }
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def _actualizar_index(
    historico_dir: str,
    snapshot_id: str,
    label: str,
    archivo: str,
    modo_softland: str,
    norma: str,
    fuente_datos: str,
    alcance: str,
) -> None:
    index_path = os.path.join(historico_dir, "index.json")
    with open(index_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    snapshots = [s for s in data.get("snapshots", []) if s.get("id") != snapshot_id]
    entry = {
        "id": snapshot_id,
        "label": label,
        "archivo": archivo,
        "modo_softland": modo_softland,
        "norma": norma,
        "fuente_datos": fuente_datos,
        "alcance": alcance,
    }
    snapshots.append(entry)
    data["snapshots"] = snapshots

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def extraer_snapshot(
    db_name: str,
    fecha_desde: date,
    fecha_hasta: date,
    snapshot_id: str,
    modo: str,
    fuente: str,
    norma: str,
    alcance: str,
    label: str | None = None,
) -> bool:
    conn_str = _conn_str(db_name)
    modo = (modo or "movimiento").lower().strip()
    fuente = (fuente or "cwmovim").lower().strip()
    norma = (norma or "nch").lower().strip()
    alcance = (alcance or "individual").lower().strip()

    if fuente == "ifrs":
        norma = "ifrs"

    ano = fecha_hasta.year
    mes = fecha_hasta.month

    try:
        with pyodbc.connect(conn_str) as conn:
            centros_por_cuenta: dict[str, list[dict]] = {}
            descripcion: str
            tablas_ref: str
            modo_softland: str
            modo_cli: str
            modo_txt: str
            archivo_nombre: str
            id_publico: str
            fecha_desde_meta: str | None

            if fuente == "cwmovim":
                if modo == "cierre":
                    sql = _apply_schema_to_cwmovim_sql(SQL_SALDO_HASTA_FECHA)
                    params = (fecha_hasta.isoformat(),)
                    modo_softland = MODO_SALDO_CIERRE
                    modo_cli = "cierre"
                    archivo_nombre = f"{snapshot_id}_cierre.json"
                    id_publico = f"{snapshot_id}-cie"
                    descripcion = (
                        "Saldo acumulado: suma de movimientos con CpbFec <= fecha_hasta (cwmovim)."
                    )
                    tablas_ref = f"{_schema_prefix()}.cwmovim, {_schema_prefix()}.cwpctas"
                    fecha_desde_meta = None
                elif modo == "movimiento":
                    sql = _apply_schema_to_cwmovim_sql(SQL_MOVIMIENTO_PERIODO)
                    params = (fecha_desde.isoformat(), fecha_hasta.isoformat())
                    modo_softland = MODO_MOVIMIENTO
                    modo_cli = "movimiento"
                    archivo_nombre = f"{snapshot_id}_movimiento.json"
                    id_publico = f"{snapshot_id}-mov"
                    descripcion = (
                        "Suma de movimientos Softland (cwmovim) entre fecha_desde y fecha_hasta."
                    )
                    tablas_ref = f"{_schema_prefix()}.cwmovim, {_schema_prefix()}.cwpctas"
                    fecha_desde_meta = fecha_desde.isoformat()
                else:
                    print(f"[ERROR] --modo debe ser 'movimiento' o 'cierre' (recibido: {modo!r})")
                    return False
                df = _read_sql_df(conn, sql, params)
                centros_por_cuenta = _centros_por_cuenta_cwmovim(
                    conn, _schema_prefix(), modo, fecha_desde, fecha_hasta
                )
                modo_txt = "Movimiento del periodo" if modo == "movimiento" else "Saldo a fecha (cwmovim)"

            elif fuente == "saldo_vista":
                vari = sql_saldo_vista_por_ano_mes()
                sql_variants = [(v[0], v[1]) for v in vari]
                df, var_label = _read_df_fallback(conn, sql_variants, (ano, mes))
                modo_softland = MODO_SALDO_CIERRE
                modo_cli = modo
                archivo_nombre = f"{snapshot_id}_saldo_vista.json"
                id_publico = f"{snapshot_id}-sv"
                descripcion = (
                    f"Saldos desde vista CW_vsnpSaldoCuenta (variante columnas: {var_label}). "
                    f"Periodo {ano}-{mes:02d}."
                )
                tablas_ref = f"{_schema_prefix()}.CW_vsnpSaldoCuenta, {_schema_prefix()}.cwpctas"
                fecha_desde_meta = None
                modo_txt = "Vista saldos cuenta (local)"

            elif fuente == "ifrs":
                vari = sql_ifrs_con_fallback_cwmovim_cpb()
                sql_variants = [(v[0], v[1]) for v in vari]
                df, var_label = _read_df_fallback(conn, sql_variants, (ano, mes))
                # Vista IFRS = saldo; fallback cwmovim por periodo = neto del mes (como consulta Snowflake).
                if "cwmovim.CpbAno" in var_label:
                    modo_softland = MODO_MOVIMIENTO
                    modo_txt = "IFRS (fallback: cwmovim CpbAno/CpbMes)"
                else:
                    modo_softland = MODO_SALDO_CIERRE
                    modo_txt = "IFRS (vista saldos)"
                modo_cli = modo
                archivo_nombre = f"{snapshot_id}_ifrs.json"
                id_publico = f"{snapshot_id}-ifrs"
                descripcion = (
                    f"IFRS: intento CW_vsnpSalCtaIFRS; si aplica, variante {var_label}. "
                    f"Periodo {ano}-{mes:02d}."
                )
                tablas_ref = (
                    f"{_schema_prefix()}.CW_vsnpSalCtaIFRS, {_schema_prefix()}.cwpctas"
                    if "cwmovim.CpbAno" not in var_label
                    else f"{_schema_prefix()}.CW_vsnpSalCtaIFRS o {_tablas_cwmovim_ref()}"
                )
                fecha_desde_meta = None

            elif fuente == "cwmovim_cpb":
                vari = sql_cwmovim_por_cpb_ano_mes()
                sql_variants = [(v[0], v[1]) for v in vari]
                df, var_label = _read_df_fallback(conn, sql_variants, (ano, mes))
                modo_softland = MODO_MOVIMIENTO
                modo_cli = modo
                archivo_nombre = f"{snapshot_id}_cwmovim_cpb.json"
                id_publico = f"{snapshot_id}-cpb"
                descripcion = (
                    f"Neto MovDebe-MovHaber por periodo contable ({var_label}). "
                    f"Periodo {ano}-{mes:02d}."
                )
                tablas_ref = _tablas_cwmovim_ref()
                fecha_desde_meta = None
                modo_txt = "cwmovim (CpbAno/CpbMes)"
                centros_por_cuenta = _centros_por_cuenta_cwmovim(
                    conn,
                    _schema_prefix(),
                    modo="movimiento",
                    fecha_desde=None,
                    fecha_hasta=None,
                    ano=ano,
                    mes=mes,
                    usar_cpb=True,
                )

            else:
                print(
                    f"[ERROR] --fuente debe ser cwmovim|saldo_vista|ifrs|cwmovim_cpb "
                    f"(recibido: {fuente!r})"
                )
                return False

        historico_dir = os.path.join(
            _PROJECT_ROOT, "src", "assets", "data", db_name, "historico"
        )
        os.makedirs(historico_dir, exist_ok=True)
        _asegurar_index(historico_dir, db_name)

        salida = os.path.join(historico_dir, archivo_nombre)

        cuentas_records = df.to_dict(orient="records")
        if 'centros_por_cuenta' in locals() and centros_por_cuenta:
            for rec in cuentas_records:
                codigo = str(rec.get("Codigo", "")).strip()
                rec["centros"] = centros_por_cuenta.get(codigo, [])

        payload = {
            "meta": {
                "empresa": db_name,
                "fecha_desde": fecha_desde_meta,
                "fecha_hasta": fecha_hasta.isoformat(),
                "snapshot_id": snapshot_id,
                "snapshot_id_ui": id_publico,
                "modo_softland": modo_softland,
                "modo_cli": modo_cli,
                "fuente_datos": fuente,
                "norma": norma,
                "alcance": alcance,
                "descripcion_modo": descripcion,
                "tablas_softland": tablas_ref,
                "solo_lectura_sql": True,
            },
            "cuentas": cuentas_records,
        }

        with open(salida, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=4)

        lbl = label or f"{modo_txt} · {norma.upper()} · {alcance} · hasta {fecha_hasta} ({snapshot_id})"
        _actualizar_index(
            historico_dir,
            id_publico,
            lbl,
            archivo_nombre,
            modo_softland,
            norma,
            fuente,
            alcance,
        )

        print(f"[OK] Snapshot guardado: {salida}")
        print(f"[OK] Indice id={id_publico!r} fuente={fuente!r} norma={norma!r}")
        return True
    except Exception as e:
        print(f"[ERROR] snapshot ({db_name}): {e}")
        print(
            "[HINT] Vistas: SELECT TOP 5 * FROM "
            f"{_schema_prefix()}.CW_vsnpSaldoCuenta / CW_vsnpSalCtaIFRS. "
            "O usa --fuente cwmovim_cpb / SOFTLAND_TABLE_PREFIX para cwmovim por CpbAno/CpbMes."
        )
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Snapshot contable Softland (cwmovim / vistas / IFRS)"
    )
    parser.add_argument("empresa", help="Nombre de la base de datos Softland")
    parser.add_argument("--desde", required=True, help="Fecha inicio YYYY-MM-DD")
    parser.add_argument("--hasta", required=True, help="Fecha fin YYYY-MM-DD")
    parser.add_argument("--id", required=True, dest="snap_id", help="Id base del snapshot, ej. 2025-01")
    parser.add_argument(
        "--fuente",
        choices=("cwmovim", "saldo_vista", "ifrs", "cwmovim_cpb"),
        default="cwmovim",
        help="cwmovim | saldo_vista | ifrs (vista + fallback cwmovim Cpb) | cwmovim_cpb",
    )
    parser.add_argument(
        "--modo",
        choices=("movimiento", "cierre"),
        default="movimiento",
        help="Solo con --fuente cwmovim: movimiento o cierre",
    )
    parser.add_argument(
        "--norma",
        choices=("nch", "ifrs"),
        default="nch",
        help="Metadato normativo (ifrs si --fuente ifrs)",
    )
    parser.add_argument(
        "--alcance",
        choices=("individual", "consolidado"),
        default="individual",
        help="Metadato alcance (consolidado puede requerir otra vista en tu BD)",
    )
    parser.add_argument("--label", default=None, help="Etiqueta en el selector del dashboard")

    args = parser.parse_args()
    d0 = date.fromisoformat(args.desde)
    d1 = date.fromisoformat(args.hasta)

    norma = args.norma
    if args.fuente == "ifrs":
        norma = "ifrs"

    ok = extraer_snapshot(
        args.empresa,
        d0,
        d1,
        args.snap_id,
        args.modo,
        args.fuente,
        norma,
        args.alcance,
        args.label,
    )
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
