# test_sql_connection.py
import pyodbc

SERVER = "172.16.40.16"
USER = "consulta"
PASSWORD = "cs654321$"
DATABASE = "FIDELMIRA"  # prueba también "FIDELMIRA" si falla por mayúsculas

conn_str = (
    "DRIVER={SQL Server};"
    f"SERVER={SERVER};"
    f"DATABASE={DATABASE};"
    f"UID={USER};"
    f"PWD={PASSWORD};"
    "TrustServerCertificate=yes;"
)

try:
    with pyodbc.connect(conn_str, timeout=8) as conn:
        cur = conn.cursor()
        cur.execute("SELECT DB_NAME() AS db_actual, @@SERVERNAME AS server_name, 1 AS ok")
        row = cur.fetchone()
        print("[OK] Conexion exitosa")
        print(f"DB actual: {row.db_actual}")
        print(f"Server: {row.server_name}")
        print(f"Ping SQL: {row.ok}")
except Exception as e:
    print("[ERROR] No se pudo conectar")
    print(type(e).__name__, str(e))