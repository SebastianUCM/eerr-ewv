import json
import warnings
import os
import logging
import sys

# Silenciadores
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
logging.getLogger("google").setLevel(logging.ERROR)

from google import genai

# CONFIGURACIÓN
MI_LLAVE = os.getenv("GEMINI_API_KEY", "")

client = genai.Client(api_key=MI_LLAVE) if MI_LLAVE else None

def _cargar_datos_empresa(empresa):
    base = os.path.join("src", "assets", "data", empresa)
    ruta_contabilidad = os.path.join(base, "contabilidad.json")
    ruta_legacy = os.path.join(base, "fidelmira_dashboard.json")

    if os.path.exists(ruta_contabilidad):
        with open(ruta_contabilidad, "r", encoding="utf-8") as f:
            return json.load(f), ruta_contabilidad

    if os.path.exists(ruta_legacy):
        with open(ruta_legacy, "r", encoding="utf-8") as f:
            return json.load(f), ruta_legacy

    raise FileNotFoundError(f"No existe contabilidad.json en {base}")


def generar_insight(empresa):
    try:
        if client is None:
            raise RuntimeError("Falta variable de entorno GEMINI_API_KEY.")

        # 1. Leer datos
        datos, ruta_datos = _cargar_datos_empresa(empresa)
            
        # 2. Cálculos (Usamos abs() para que los pasivos negativos no rompan el análisis)
        activos = sum(c.get('Saldo_Actual', 0) for c in datos if str(c.get('Tipo')) == '1')
        pasivos = abs(sum(c.get('Saldo_Actual', 0) for c in datos if str(c.get('Tipo')) == '2'))
        
        prompt = f"""
        Actúa como analista financiero para la empresa {empresa}. 
        Datos: Activos ${activos:,.0f}, Pasivos ${pasivos:,.0f}. 
        Escribe un párrafo de 2 líneas sobre la liquidez y una recomendación para el flujo de caja. 
        Sé breve y ejecutivo.
        """
        
        print("🧠 Consultando a Gemini...")
        
        # CAMBIO CLAVE: Usamos el alias que tu escaneo confirmó
        response = client.models.generate_content(
            model='gemini-flash-latest', 
            contents=prompt,
        )
        
        # 3. Extraer texto de forma segura
        texto_ia = response.text.strip()
        
        # 4. Guardar para Vue
        resultado = {"comentario": texto_ia}
        carpeta_empresa = os.path.join("src", "assets", "data", empresa)
        os.makedirs(carpeta_empresa, exist_ok=True)
        ruta_insight = os.path.join(carpeta_empresa, "ia_insight.json")
        with open(ruta_insight, 'w', encoding='utf-8') as f:
            json.dump(resultado, f, ensure_ascii=False, indent=4)
            
        print(f"✅ Análisis ({empresa}) generado desde {ruta_datos} y guardado en {ruta_insight}")
        return texto_ia

    except Exception as e:
        print(f"❌ Error IA ({empresa}): {e}")
        return None

if __name__ == "__main__":
    empresa = sys.argv[1] if len(sys.argv) > 1 else "FIDELMIRA"
    insight = generar_insight(empresa)
    sys.exit(0 if insight else 1)