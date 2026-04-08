#!/usr/bin/env bash
set -euo pipefail

MONGO_ROOT_USER="${MONGO_ROOT_USER:-admin}"
KEYFILE="/data/keyfile"
ALL_ARGS=("$@")
MONGOD_PORT=""
PREV_ARG=""

if [[ -f /tmp/keyfile ]]; then
  cp /tmp/keyfile "$KEYFILE"
  chmod 400 "$KEYFILE"
  chown mongodb:mongodb "$KEYFILE"
fi

for arg in "${ALL_ARGS[@]}"; do
  if [[ "$PREV_ARG" == "--port" ]]; then
    MONGOD_PORT="$arg"
    break
  fi

  case "$arg" in
    --port=*)
      MONGOD_PORT="${arg#--port=}"
      break
      ;;
  esac

  PREV_ARG="$arg"
done

if [[ -z "$MONGOD_PORT" ]]; then
  if printf '%s\n' "${ALL_ARGS[@]}" | grep -q -- "--configsvr"; then
    MONGOD_PORT="27019"
  elif printf '%s\n' "${ALL_ARGS[@]}" | grep -q -- "--shardsvr"; then
    MONGOD_PORT="27018"
  else
    MONGOD_PORT="27017"
  fi
fi

if [[ "${INIT_REPLICA_SET:-0}" == "1" && ! -f /data/db/.rs_initiated ]]; then
  (
    for _ in $(seq 1 60); do
      if mongosh --host 127.0.0.1 --port "$MONGOD_PORT" --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    mongosh --host 127.0.0.1 --port "$MONGOD_PORT" --quiet --eval "
      try {
        if (rs.status().ok === 1) {
          quit(0);
        }
      } catch (e) {}
      rs.initiate(${RS_CONFIG});
    "

    for _ in $(seq 1 120); do
      if mongosh --host 127.0.0.1 --port "$MONGOD_PORT" --quiet --eval '
        try {
          const members = rs.status().members || [];
          print(members.some((member) => member.stateStr === "PRIMARY") ? "yes" : "no");
        } catch (e) {
          print("no");
        }
      ' 2>/dev/null | grep -q yes; then
        break
      fi
      sleep 1
    done

    mongosh --host 127.0.0.1 --port "$MONGOD_PORT" --quiet --eval "
      db = db.getSiblingDB('admin');
      try {
        db.createUser({
          user: '${MONGO_ROOT_USER}',
          pwd: '${MONGO_ROOT_PASSWORD}',
          roles: [{ role: 'root', db: 'admin' }]
        });
      } catch (e) {
        if (e.codeName !== 'DuplicateKey' && (!e.message || e.message.indexOf('already exists') === -1)) {
          throw e;
        }
      }
    "

    touch /data/db/.rs_initiated
  ) &
fi

exec gosu mongodb mongod "${ALL_ARGS[@]}"
