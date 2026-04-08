#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/.venv"
RUNTIME_DIR="$ROOT_DIR/.runtime"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api}"
export NEXT_SERVER_API_URL="${NEXT_SERVER_API_URL:-http://127.0.0.1:5000/api}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"

mkdir -p "$RUNTIME_DIR"

if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip >/dev/null
python -m pip install -r "$BACKEND_DIR/requirements.txt" >/dev/null

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  (cd "$FRONTEND_DIR" && npm install)
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
}

trap cleanup EXIT INT TERM

echo "[run] Backend:  http://127.0.0.1:5000"
echo "[run] Frontend: http://127.0.0.1:3000"
echo "[run] Ollama:   ${OLLAMA_BASE_URL}"

(cd "$BACKEND_DIR" && python -m flask --app app run --debug --host 0.0.0.0 --port 5000 --no-reload) &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

wait -n "$BACKEND_PID" "$FRONTEND_PID"
