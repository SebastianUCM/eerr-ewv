import pyodbc

server = '172.16.40.16'
database = 'Fidelmira'
user = 'consulta'
password = 'cs654321$'
    
conn_str = (
    f"DRIVER={{SQL Server}};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"UID={user};"
    f"PWD={password};"
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

print("🔍 Buscando tablas en el servidor...")
# Esta consulta busca en qué base de datos y esquema está la tabla cw_actu
query = "SELECT TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'cw_actu'"

cursor.execute(query)
row = cursor.fetchone()
if row:
    print(f"\n✅ ¡ENCONTRADA!")
    print(f"Debes usar: {row[0]}.{row[1]}.{row[2]}")
else:
    print("\n❌ No se encontró la tabla con el nombre 'cw_actu'.")
    print("Probando listar todas las bases de datos disponibles...")
    cursor.execute("SELECT name FROM sys.databases")
    for db in cursor.fetchall():
        print(f"- {db[0]}")