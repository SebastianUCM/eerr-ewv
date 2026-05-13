# Prediccion de ventas (Statsmodels)

## Dependencias

```bash
pip install -r requirements.txt
```

## Flujo

1. `extract_macro.py` (global) — alimenta `src/assets/data/macro.json`.
2. `extract_historico.py {EMPRESA}` — serie mensual 3 años → `historico_ventas.json`.
3. `predecir_ventas.py {EMPRESA}` — lee histórico + `macro.json` + series mindicador.cl → `predicciones.json`.

## SQL

Se intenta en orden: `dbo.nw_nven` (nv_fecha/nv_totn), variante Fecha/Total, y `softland.iw_gsaen` como respaldo.

## Modelo

- Preferido: **SARIMAX** con regresores dólar + IPC (series mensuales mindicador).
- Alternativa: **ARIMA(1,1,1)**.
- Fallback: **tendencia lineal** con banda empírica.

## Flujo de caja

En `predicciones.json` el bloque `flujo_caja` replica el pronóstico de ventas (MVP) hasta definir tesorería real.
