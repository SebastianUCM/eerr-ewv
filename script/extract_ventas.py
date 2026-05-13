import json
import os
import sys

import pandas as pd
import pyodbc


def extraer_ventas(db_name):
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

    query = """
    SELECT
        SUM(ISNULL(Total, 0)) AS total_mes,
        COUNT(*) AS cant_docs
    FROM softland.iw_gsaen
    WHERE YEAR(Fecha) = YEAR(GETDATE())
      AND MONTH(Fecha) = MONTH(GETDATE())
      AND ISNULL(Estado, '') <> 'N'
    """

    try:
        with pyodbc.connect(conn_str) as conn:
            df = pd.read_sql(query, conn)

        data = df.to_dict(orient="records")[0] if not df.empty else {"total_mes": 0, "cant_docs": 0}
        data["total_mes"] = float(data.get("total_mes") or 0)
        data["cant_docs"] = int(data.get("cant_docs") or 0)

        folder = os.path.join("src", "assets", "data", db_name)
        os.makedirs(folder, exist_ok=True)
        ruta = os.path.join(folder, "ventas.json")

        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        print(f"✅ Ventas {db_name} actualizadas en {ruta}.")
        return True

    except Exception as e:
        print(f"❌ Error Ventas ({db_name}): {e}")
        return False


if __name__ == "__main__":
    empresa = sys.argv[1] if len(sys.argv) > 1 else "FIDELMIRA"
    ok = extraer_ventas(empresa)
    sys.exit(0 if ok else 1)