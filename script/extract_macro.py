"""
Indicadores macro (Chile) vía API pública mindicador.cl — solo lectura HTTP.

Escribe: src/assets/data/macro.json

Uso:
  python script/extract_macro.py

No requiere SQL ni empresa; puede ejecutarse en update_all.py una vez por corrida.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

OUT_PATH = os.path.join("src", "assets", "data", "macro.json")

ENDPOINTS = {
    "uf": "https://mindicador.cl/api/uf",
    "dolar": "https://mindicador.cl/api/dolar",
    "ipc": "https://mindicador.cl/api/ipc",
}


def _get_json(url: str, timeout: int = 30) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "dashboard-fidelmira-extract_macro/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        print(f"[WARN] No se pudo leer {url}: {e}")
        return None


def _ultimo_valor(serie: list) -> tuple[float | None, str | None]:
    if not serie:
        return None, None
    last = serie[-1]
    val = last.get("valor")
    fecha = last.get("fecha")
    try:
        v = float(val) if val is not None else None
    except (TypeError, ValueError):
        v = None
    if isinstance(fecha, str):
        f = fecha
    else:
        f = None
    return v, f


def _ipc_variacion_mensual_pct(serie: list) -> float | None:
    """
    mindicador.cl: en la serie del IPC cada punto suele traer la variación mensual (%).
    Usamos el último valor publicado como proxy de inflación mensual reciente.
    """
    if not serie:
        return None
    last = serie[-1].get("valor")
    try:
        return float(last)
    except (TypeError, ValueError):
        return None


def main() -> int:
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    indicadores: dict = {}
    errores: list[str] = []

    for codigo, url in ENDPOINTS.items():
        data = _get_json(url)
        if not data:
            errores.append(codigo)
            continue
        serie = data.get("serie") or []
        valor, fecha = _ultimo_valor(serie)
        entry = {
            "nombre": data.get("nombre") or codigo.upper(),
            "unidad_medida": data.get("unidad_medida"),
            "valor": valor,
            "fecha": fecha,
        }
        if codigo == "ipc" and serie:
            entry["variacion_mensual_pct"] = _ipc_variacion_mensual_pct(serie)
        indicadores[codigo] = entry

    payload = {
        "meta": {
            "actualizado_utc": datetime.now(timezone.utc).isoformat(),
            "fuente": "https://mindicador.cl",
            "solo_lectura_http": True,
        },
        "indicadores": indicadores,
    }

    if errores:
        payload["meta"]["advertencia"] = f"Faltaron indicadores: {', '.join(errores)}"

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[OK] macro.json escrito: {OUT_PATH}")
    for k, v in indicadores.items():
        print(f"   - {k}: {v.get('valor')}")
    return 0  # no fallar el pipeline si falla la red (macro.json igual se escribe)


if __name__ == "__main__":
    sys.exit(main())
