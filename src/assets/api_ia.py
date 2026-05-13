import os
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai


def _load_dotenv_repo() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "package.json").is_file() and (current / ".env").is_file():
            load_dotenv(current / ".env")
            return
        if current.parent == current:
            break
        current = current.parent


_load_dotenv_repo()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY no está definida. Configúrala en el entorno o en un .env en la raíz del proyecto."
    )

genai.configure(api_key=GEMINI_API_KEY)
modelo = genai.GenerativeModel("models/gemini-2.5-flash")

_DATA_DIR = Path(__file__).resolve().parent


def _ruta_datos(nombre: str) -> Path:
    override = os.getenv("DATA_DIR", "").strip()
    base = Path(override) if override else _DATA_DIR
    return base / nombre


def _parse_cors_origins() -> tuple[list[str], bool]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*":
        return ["*"], False
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        return ["*"], False
    return origins, True


_origins, _creds = _parse_cors_origins()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConsultaIA(BaseModel):
    mensaje: str
    rol: str
    empresa: str
    anio: int
    mes: int


def cargar_contexto_financiero(empresa: str, anio: int, mes: int):
    try:
        with open(_ruta_datos("datos_vue.json"), "r", encoding="utf-8") as f:
            datos_completos = json.load(f)

        resumen_cuentas = {}
        for d in datos_completos:
            if d.get("Empresa") == empresa and int(d.get("Anio")) == anio and int(d.get("Mes")) <= mes:
                cta = d.get("CodigoCuenta")
                if cta not in resumen_cuentas:
                    resumen_cuentas[cta] = {"Debe": 0, "Haber": 0}
                resumen_cuentas[cta]["Debe"] += d.get("TotalDebe", 0)
                resumen_cuentas[cta]["Haber"] += d.get("TotalHaber", 0)

        datos_optimizados = [
            {"Cta": k, "D": round(v["Debe"]), "H": round(v["Haber"])}
            for k, v in resumen_cuentas.items() if v["Debe"] > 0 or v["Haber"] > 0
        ]

        cuentas_activas = set(resumen_cuentas.keys())
        with open(_ruta_datos("plan_cuentas.json"), "r", encoding="utf-8") as f:
            plan_completo = json.load(f)

        plan_optimizado = [
            {"Cta": c.get("CodigoCuenta"), "Nom": c.get("NombreCuenta")}
            for c in plan_completo
            if c.get("Empresa") == empresa and c.get("CodigoCuenta") in cuentas_activas
        ]

        return json.dumps(datos_optimizados, separators=(",", ":")), json.dumps(plan_optimizado, separators=(",", ":"))
    except Exception as e:
        print(f"Error agrupando JSON: {e}")
        return "[]", "[]"


@app.post("/chat")
async def chat_financiero(consulta: ConsultaIA):

    datos_json, plan_json = cargar_contexto_financiero(consulta.empresa, consulta.anio, consulta.mes)

    if consulta.rol == "analista":
        prompt_sistema = f"""
        Eres un Analista Financiero Senior. Analiza el Balance de Comprobación acumulado a MES {consulta.mes} del AÑO {consulta.anio} de {consulta.empresa}.
        DATOS: {datos_json}
        CUENTAS: {plan_json}
        Responde la pregunta del usuario evaluando rentabilidad y gastos. Sé directo y usa montos en pesos chilenos.
        """
    else:
        prompt_sistema = f"""
        Eres un Auditor Técnico Contable. Revisa el Balance al MES {consulta.mes} del AÑO {consulta.anio} de {consulta.empresa}.
        CUENTAS: {plan_json}
        SALDOS: {datos_json}
        Responde dudas técnicas sobre cuentas y descuadres.
        """

    prompt_final = f"{prompt_sistema}\n\nPregunta: {consulta.mensaje}"

    try:
        respuesta_stream = modelo.generate_content(prompt_final, stream=True)

        def generador_respuesta():
            for pedazo in respuesta_stream:
                if pedazo.text:
                    yield pedazo.text

        return StreamingResponse(generador_respuesta(), media_type="text/plain")

    except Exception as e:
        print(f"\n❌ ERROR DE GEMINI: {str(e)}\n")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
