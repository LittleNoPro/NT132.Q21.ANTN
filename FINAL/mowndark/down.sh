#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"

stop_pid_file() {
  local label="$1"
  local file="$2"

  if [[ -f "$file" ]]; then
    local pid
    pid="$(<"$file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "[down] Stopping $label (pid $pid)"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$file"
  fi
}

stop_port() {
  local label="$1"
  local port="$2"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "${port}/tcp" 2>/dev/null || true)"
  fi

  if [[ -n "$pids" ]]; then
    echo "[down] Stopping $label on port $port"
    kill $pids 2>/dev/null || true
  fi
}

stop_pid_file "backend" "$BACKEND_PID_FILE"
stop_pid_file "frontend" "$FRONTEND_PID_FILE"

stop_port "backend" 5000
stop_port "frontend" 3000

rm -rf "$RUNTIME_DIR"
echo "[down] Done."
