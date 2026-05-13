"""
Serie mensual de ventas (ultimos 3 anios) desde SQL Server.

Prioridad de consultas:
  1) dbo.nw_nven (SUM(nv_totn) por mes) — columnas tipicas nv_fecha + nv_totn
  2) dbo.nw_nven con Fecha / Total (variantes)
  3) softland.iw_gsaen (SUM(Total) por mes) — mismo criterio que extract_ventas.py

Salida: src/assets/data/{empresa}/historico_ventas.json
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime

import pandas as pd
import pyodbc

OUT_NAME = "historico_ventas.json"

# (nombre, sql) — se prueba en orden hasta que una devuelva filas
QUERIES = [
    (
        "dbo.nw_nven (nv_fecha, nv_totn)",
        """
        SELECT
            FORMAT(nv_fecha, 'yyyy-MM') AS periodo,
            CAST(SUM(ISNULL(nv_totn, 0)) AS FLOAT) AS total_mes
        FROM dbo.nw_nven
        WHERE nv_fecha >= DATEADD(YEAR, -3, CAST(GETDATE() AS date))
        GROUP BY YEAR(nv_fecha), MONTH(nv_fecha), FORMAT(nv_fecha, 'yyyy-MM')
        ORDER BY YEAR(nv_fecha), MONTH(nv_fecha)
        """,
    ),
    (
        "dbo.nw_nven (Fecha, Total)",
        """
        SELECT
            FORMAT(Fecha, 'yyyy-MM') AS periodo,
            CAST(SUM(ISNULL(Total, 0)) AS FLOAT) AS total_mes
        FROM dbo.nw_nven
        WHERE Fecha >= DATEADD(YEAR, -3, CAST(GETDATE() AS date))
        GROUP BY YEAR(Fecha), MONTH(Fecha), FORMAT(Fecha, 'yyyy-MM')
        ORDER BY YEAR(Fecha), MONTH(Fecha)
        """,
    ),
    (
        "softland.iw_gsaen",
        """
        SELECT
            FORMAT(Fecha, 'yyyy-MM') AS periodo,
            CAST(SUM(ISNULL(Total, 0)) AS FLOAT) AS total_mes
        FROM softland.iw_gsaen
        WHERE Fecha >= DATEADD(YEAR, -3, CAST(GETDATE() AS date))
          AND ISNULL(Estado, '') <> 'N'
        GROUP BY YEAR(Fecha), MONTH(Fecha), FORMAT(Fecha, 'yyyy-MM')
        ORDER BY YEAR(Fecha), MONTH(Fecha)
        """,
    ),
]


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


def extraer_historico(db_name: str) -> bool:
    conn_str = _conn_str(db_name)
    df = pd.DataFrame()
    fuente = ""

    try:
        with pyodbc.connect(conn_str) as conn:
            for nombre, sql in QUERIES:
                try:
                    temp = pd.read_sql(sql, conn)
                except Exception as e:
                    print(f"[WARN] {nombre}: {e}")
                    continue
                if temp is not None and not temp.empty:
                    df = temp
                    fuente = nombre
                    break

        folder = os.path.join("src", "assets", "data", db_name)
        os.makedirs(folder, exist_ok=True)
        ruta = os.path.join(folder, OUT_NAME)

        serie = []
        if not df.empty:
            for _, row in df.iterrows():
                serie.append(
                    {
                        "periodo": str(row["periodo"]),
                        "total_mes": float(row["total_mes"] or 0),
                    }
                )

        payload = {
            "meta": {
                "empresa": db_name,
                "generado_local": datetime.now().isoformat(timespec="seconds"),
                "fuente_sql": fuente or "ninguna (sin filas)",
                "anios": 3,
            },
            "serie_mensual": serie,
        }

        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        print(f"[OK] {OUT_NAME} ({db_name}) filas={len(serie)} fuente={fuente or '—'}")
        return True

    except Exception as e:
        print(f"[ERROR] historico ({db_name}): {e}")
        return False


if __name__ == "__main__":
    emp = sys.argv[1] if len(sys.argv) > 1 else "FIDELMIRA"
    ok = extraer_historico(emp)
    sys.exit(0 if ok else 1)
