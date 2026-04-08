#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
KEYFILE="$ROOT_DIR/db/keyfile"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

mkdir -p "$ROOT_DIR/db"

if [[ ! -f "$KEYFILE" ]]; then
  openssl rand -base64 756 > "$KEYFILE"
fi

chmod 600 "$KEYFILE"

if [[ ! -f "$ENV_FILE" && -f "$ENV_EXAMPLE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

chmod +x "$SCRIPT_DIR"/*.sh

echo "[setup] Ready."
echo "[setup] Run: docker-compose up --build -d"
