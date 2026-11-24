#!/bin/sh
# Azure App Service startup: seed CRM schema, then serve site+API with uvicorn.
set -e
mkdir -p /home/data /home/data/uploads
cd "$(dirname "$0")/backend"
python -m app.seed
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
