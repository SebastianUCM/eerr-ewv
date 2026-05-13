"""
Plantillas SQL solo lectura para Softland (esquema por defecto: softland).

Si tu instancia usa otros nombres de columna en las vistas vsnp, define:
  SOFTLAND_SCHEMA=dbo
y/o ajusta las consultas en este archivo tras:
  SELECT TOP 5 * FROM softland.CW_vsnpSaldoCuenta;

Prefijo calificado (p. ej. copia en otro DB/esquema o Snowflake export):
  SOFTLAND_TABLE_PREFIX=BACKUP_EMPRESAS.FIDELMIRA
  → FROM BACKUP_EMPRESAS.FIDELMIRA.cwmovim (sin cambiar SOFTLAND_SCHEMA)
"""

from __future__ import annotations

import os


def _schema() -> str:
    return os.getenv("SOFTLAND_SCHEMA", "softland").strip()


def _qualified_table(table: str) -> str:
    """
    Nombre calificado para cwmovim / cwpctas.
    SOFTLAND_TABLE_PREFIX reempluye esquema simple (softland.tabla).
    """
    p = os.getenv("SOFTLAND_TABLE_PREFIX", "").strip()
    if p:
        return f"{p}.{table}"
    return f"{_schema()}.{table}"


def sql_saldo_vista_por_ano_mes() -> list[tuple[str, str]]:
    """
    Lista de (sql, params_tuple) a probar en orden.
    Params: (ano, mes) como enteros.
    """
    s = _schema()

    # Variante 1: Ano / Mes (común en vistas Softland)
    q1 = f"""
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT)) AS Saldo_Actual
FROM {s}.CW_vsnpSaldoCuenta v
INNER JOIN {s}.cwpctas c ON v.PctCod = c.PCCODI
WHERE v.Ano = ? AND v.Mes = ?
GROUP BY c.PCCODI, c.PCDESC
HAVING ABS(SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT))) > 0.0001
ORDER BY c.PCCODI
"""

    # Variante 2: CpbAno / CpbMes
    q2 = f"""
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT)) AS Saldo_Actual
FROM {s}.CW_vsnpSaldoCuenta v
INNER JOIN {s}.cwpctas c ON v.PctCod = c.PCCODI
WHERE v.CpbAno = ? AND v.CpbMes = ?
GROUP BY c.PCCODI, c.PCDESC
HAVING ABS(SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT))) > 0.0001
ORDER BY c.PCCODI
"""

    # Params: (ano, mes) — se rellenan al llamar
    return [(q1, "Ano/Mes"), (q2, "CpbAno/CpbMes")]


def sql_cwmovim_por_cpb_ano_mes() -> list[tuple[str, str]]:
    """
    Mismo enfoque que en Snowflake: agregar cwmovim por periodo contable CpbAno/CpbMes
    con neto MovDebe - MovHaber. Params: (ano, mes) enteros.

    Útil cuando CW_vsnpSalCtaIFRS no existe o tiene columnas distintas; no es “IFRS”
    contable hasta mapear cuentas, pero reproduce el criterio de tu consulta sugerida.
    """
    mov = _qualified_table("cwmovim")
    pct = _qualified_table("cwpctas")
    q = f"""
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(CAST(ISNULL(v.MovDebe, 0) AS FLOAT) - CAST(ISNULL(v.MovHaber, 0) AS FLOAT)) AS Saldo_Actual
FROM {mov} v
INNER JOIN {pct} c ON v.PctCod = c.PCCODI
WHERE v.CpbAno = ? AND v.CpbMes = ?
GROUP BY c.PCCODI, c.PCDESC
HAVING ABS(SUM(CAST(ISNULL(v.MovDebe, 0) AS FLOAT) - CAST(ISNULL(v.MovHaber, 0) AS FLOAT))) > 0.0001
ORDER BY c.PCCODI
"""
    return [(q, "cwmovim.CpbAno/CpbMes (MovDebe-MovHaber)")]


def sql_ifrs_por_ano_mes() -> list[tuple[str, str]]:
    """Lista de (sql, etiqueta) para CW_vsnpSalCtaIFRS."""
    s = _schema()

    q1 = f"""
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT)) AS Saldo_Actual
FROM {s}.CW_vsnpSalCtaIFRS v
INNER JOIN {s}.cwpctas c ON v.PctCod = c.PCCODI
WHERE v.Ano = ? AND v.Mes = ?
GROUP BY c.PCCODI, c.PCDESC
HAVING ABS(SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT))) > 0.0001
ORDER BY c.PCCODI
"""

    q2 = f"""
SELECT
    LEFT(c.PCCODI, 1) AS Tipo,
    c.PCCODI AS Codigo,
    c.PCDESC AS Nombre,
    SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT)) AS Saldo_Actual
FROM {s}.CW_vsnpSalCtaIFRS v
INNER JOIN {s}.cwpctas c ON v.PctCod = c.PCCODI
WHERE v.CpbAno = ? AND v.CpbMes = ?
GROUP BY c.PCCODI, c.PCDESC
HAVING ABS(SUM(CAST(ISNULL(v.Saldo, 0) AS FLOAT))) > 0.0001
ORDER BY c.PCCODI
"""

    return [(q1, "Ano/Mes"), (q2, "CpbAno/CpbMes")]


def sql_ifrs_con_fallback_cwmovim_cpb() -> list[tuple[str, str]]:
    """Primero vistas IFRS; si fallan columnas, mismo periodo vía cwmovim (neto debe-haber)."""
    return [*sql_ifrs_por_ano_mes(), *sql_cwmovim_por_cpb_ano_mes()]


def sql_ifrs_con_fallback_cwmovim_cpb() -> list[tuple[str, str]]:
    """Primero vistas IFRS; si fallan columnas, mismo periodo vía cwmovim (neto debe-haber)."""
    return [*sql_ifrs_por_ano_mes(), *sql_cwmovim_por_cpb_ano_mes()]
