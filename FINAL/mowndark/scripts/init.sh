#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
elif [[ -f "$ROOT_DIR/.env.example" ]]; then
  set -a
  source "$ROOT_DIR/.env.example"
  set +a
fi

if [[ "${1:-}" == "--reset-notes" ]]; then
  export RESET_NOTES=1
fi

MONGO_HOST="${MONGO_HOST:-127.0.0.1}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-Admin@123}"
MONGO_AUTH_DB="${MONGO_AUTH_DB:-admin}"
BACKEND_API_URL="${BACKEND_API_URL:-http://127.0.0.1:5000/api}"

echo "[init] Mongo host: ${MONGO_HOST}:${MONGO_PORT}"
if [[ "${RESET_NOTES:-0}" == "1" ]]; then
  echo "[init] RESET_NOTES=1, existing notes will be removed before seeding."
fi

mongosh \
  --host "$MONGO_HOST" \
  --port "$MONGO_PORT" \
  -u "$MONGO_USER" \
  -p "$MONGO_PASSWORD" \
  --authenticationDatabase "$MONGO_AUTH_DB" \
  "$SCRIPT_DIR/init.js"

if command -v curl >/dev/null 2>&1; then
  curl -fsS -X POST "${BACKEND_API_URL}/search/reindex" >/dev/null 2>&1 && echo "[init] Embeddings reindexed." || true
fi
