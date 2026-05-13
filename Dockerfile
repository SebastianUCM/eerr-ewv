FROM python:3.12-slim

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/assets/api_ia.py ./api_ia.py
COPY src/assets/datos_vue.json ./
COPY src/assets/plan_cuentas.json ./

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD sh -c "exec uvicorn api_ia:app --host 0.0.0.0 --port ${PORT:-8000}"
