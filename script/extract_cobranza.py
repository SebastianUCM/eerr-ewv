import pandas as pd
import pyodbc
import json
import os
import sys


def extraer(db_name):
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

    queries = [
        """
        SELECT TOP 5
            CodAux AS cliente,
            SUM(ISNULL(Monto,0) - ISNULL(MontoIngreso,0)) AS pendiente,
            COUNT(*) AS documentos
        FROM softland.vsnp_CuotasPorDocumento
        GROUP BY CodAux
        HAVING SUM(ISNULL(Monto,0) - ISNULL(MontoIngreso,0)) > 0
        ORDER BY pendiente DESC
        """,
        """
        SELECT TOP 5
            CodAux AS cliente,
            SUM(ISNULL(Monto,0) - ISNULL(MontoIngreso,0)) AS pendiente,
            COUNT(*) AS documentos
        FROM softland.vsnp_CuotasPorDocumentoSCuotas
        GROUP BY CodAux
        HAVING SUM(ISNULL(Monto,0) - ISNULL(MontoIngreso,0)) > 0
        ORDER BY pendiente DESC
        """
    ]

    try:
        with pyodbc.connect(conn_str) as conn:
            df = pd.DataFrame()
            for q in queries:
                temp = pd.read_sql(q, conn)
                if not temp.empty:
                    df = temp
                    break

        folder = os.path.join("src", "assets", "data", db_name)
        os.makedirs(folder, exist_ok=True)

        ruta = os.path.join(folder, "cobranzas.json")
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(df.to_dict(orient="records"), f, ensure_ascii=False, indent=4)

        if df.empty:
            print(f"⚠️ Cobranzas {db_name}: sin datos pendientes en las vistas consultadas.")
        else:
            print(f"✅ Cobranzas {db_name} actualizadas.")
        return True

    except Exception as e:
        print(f"❌ Error Cobranzas {db_name}: {e}")
        return False


if __name__ == "__main__":
    empresa = sys.argv[1] if len(sys.argv) > 1 else "FIDELMIRA"
    ok = extraer(empresa)
    sys.exit(0 if ok else 1)