import os
import subprocess

import pyodbc

# Lista objetivo de bases/empresas
empresas = [
    "WCORP1",
    "FIDELMIRA",
    "STAFIDEL2",
    "NUEVAFIDELMIRA",
    "RRHH2021",
    "INEWASPA",
    "WCORP2",
    "CTERGSPA",
]

scripts = [
    ["python", "script/extract_contabilidad.py"],
    ["python", "script/extract_ventas.py"],
    ["python", "script/extract_historico.py"],
    ["python", "script/extract_cobranza.py"],
    ["python", "script/predecir_ventas.py"],
    ["python", "analista_ia.py"],
]


def puede_conectar(db_name: str):
    server = os.getenv("SOFTLAND_SQL_SERVER", "172.16.40.16")
    user = os.getenv("SOFTLAND_SQL_USER", "consulta")
    password = os.getenv("SOFTLAND_SQL_PASSWORD", "cs654321$")

    conn_str = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={db_name};"
        f"UID={user};"
        f"PWD={password};"
        f"TrustServerCertificate=yes;"
    )

    try:
        with pyodbc.connect(conn_str, timeout=5):
            return True, None
    except Exception as e:
        return False, str(e)


def main():
    print("\n🔎 PRE-CHEQUEO DE ACCESO A BASES")
    print("=" * 50)

    accesibles = []
    bloqueadas = []

    for emp in empresas:
        ok, err = puede_conectar(emp)
        if ok:
            accesibles.append(emp)
            print(f"✅ {emp}: acceso OK")
        else:
            bloqueadas.append((emp, err))
            print(f"⛔ {emp}: sin acceso")

    print("\n📌 RESUMEN PRE-CHEQUEO")
    print(f"- Accesibles: {len(accesibles)}")
    print(f"- Bloqueadas: {len(bloqueadas)}")

    if bloqueadas:
        print("\nEmpresas bloqueadas:")
        for emp, _ in bloqueadas:
            print(f"  - {emp}")

    if not accesibles:
        print("\n❌ No hay empresas accesibles. Fin de ejecución.")
        return

    print("\n🌐 MACRO (mindicador.cl — sin SQL)")
    print("=" * 50)
    try:
        subprocess.run(["python", "script/extract_macro.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"⚠️ extract_macro.py falló (exit={e.returncode}). Se continúa con empresas.")

    print("\n🚀 EJECUCIÓN DE EXTRACTORES")
    print("=" * 50)

    resumen = []

    for emp in accesibles:
        print(f"\n🚀 PROCESANDO EMPRESA: {emp} " + "=" * 20)
        errores_empresa = []

        for script in scripts:
            cmd = script + [emp]
            nombre_script = script[-1]
            try:
                subprocess.run(cmd, check=True)
            except subprocess.CalledProcessError as e:
                errores_empresa.append((nombre_script, e.returncode))
                print(f"⚠️ Falló {nombre_script} para {emp} (exit={e.returncode}). Se continúa.")

        if not errores_empresa:
            print(f"✅ Empresa {emp} procesada sin errores.")
            resumen.append((emp, []))
        else:
            print(f"⚠️ Empresa {emp} procesada con {len(errores_empresa)} error(es).")
            resumen.append((emp, errores_empresa))

    print("\n📊 RESUMEN FINAL")
    print("=" * 50)
    for emp, errores in resumen:
        if not errores:
            print(f"✅ {emp}: OK")
        else:
            print(f"⚠️ {emp}: {len(errores)} error(es)")
            for nombre_script, exit_code in errores:
                print(f"   - {nombre_script} (exit={exit_code})")

    print("\n✨ ¡Proceso finalizado!")


if __name__ == "__main__":
    main()