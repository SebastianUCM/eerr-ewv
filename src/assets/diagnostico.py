import os
import google.generativeai as genai

_key = os.getenv("GEMINI_API_KEY", "").strip()
if not _key:
    raise SystemExit("Define la variable de entorno GEMINI_API_KEY.")
genai.configure(api_key=_key)

print("🔍 Buscando modelos disponibles para tu cuenta...\n")

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Modelo válido encontrado: {m.name}")
except Exception as e:
    print(f"Error al conectar: {e}")