FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends gcc build-essential && rm -rf /var/lib/apt/lists/*

# Install runtime dependencies
RUN pip install --no-cache-dir fastapi uvicorn[standard] pymongo

# Copy the FastAPI package
COPY ./dev_utilities/fastapi_ais ./fastapi_ais

EXPOSE 8000

CMD ["uvicorn", "fastapi_ais.main:app", "--host", "0.0.0.0", "--port", "8000"]
