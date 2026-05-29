#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

run_mongosh() {
  local service="$1"
  local script="$2"
  compose exec -T "$service" mongosh --quiet "$script"
}

echo "[init] Initializing config server replica set"
run_mongosh configsvr0 /scripts/init-configsvr.js
run_mongosh configsvr0 /scripts/wait-for-primary.js

echo "[init] Initializing shard replica sets"
run_mongosh shard00 /scripts/init-rs0.js
run_mongosh shard00 /scripts/wait-for-primary.js
run_mongosh shard10 /scripts/init-rs1.js
run_mongosh shard10 /scripts/wait-for-primary.js
run_mongosh shard20 /scripts/init-rs2.js
run_mongosh shard20 /scripts/wait-for-primary.js

echo "[init] Registering shards"
run_mongosh router0 /scripts/init-shards.js

echo "[init] Enabling mowndark sharding and indexes"
run_mongosh router0 /scripts/enable-app-sharding.js

echo "[init] Loading demo notes"
run_mongosh router0 /scripts/seed-notes.js

echo "[init] Cluster ready"
