#!/usr/bin/env bash
set -euo pipefail

AUTH=(-u "${MONGO_ROOT_USER}" -p "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin)

wait_for_auth() {
  local host="$1"
  local port="$2"
  local label="$3"
  local limit="${4:-120}"
  echo "[init] Waiting for ${label}..."
  for _ in $(seq 1 "$limit"); do
    if mongosh --host "$host" --port "$port" "${AUTH[@]}" --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      echo "[init] ${label} ready."
      return 0
    fi
    sleep 2
  done
  echo "[init] ${label} did not become ready." >&2
  exit 1
}

wait_for_primary() {
  local host="$1"
  local port="$2"
  local label="$3"
  local limit="${4:-120}"
  echo "[init] Waiting for ${label} primary..."
  for _ in $(seq 1 "$limit"); do
    if mongosh --host "$host" --port "$port" "${AUTH[@]}" --quiet --eval '
      try {
        const members = rs.status().members || [];
        print(members.some((member) => member.stateStr === "PRIMARY") ? "yes" : "no");
      } catch (e) {
        print("no");
      }
    ' 2>/dev/null | grep -q yes; then
      echo "[init] ${label} primary ready."
      return 0
    fi
    sleep 2
  done
  echo "[init] ${label} primary did not become ready." >&2
  exit 1
}

wait_for_auth config1 27019 configrs
wait_for_primary config1 27019 configrs
wait_for_auth shard1a 27018 shard1rs
wait_for_primary shard1a 27018 shard1rs
wait_for_auth shard2a 27018 shard2rs
wait_for_primary shard2a 27018 shard2rs
wait_for_auth shard3a 27018 shard3rs
wait_for_primary shard3a 27018 shard3rs
wait_for_auth mongos 27017 mongos 180

mongosh --host mongos --port 27017 "${AUTH[@]}" <<'EOF'
db = db.getSiblingDB("mowndark");
if (!db.getCollectionNames().includes("notes")) {
  db.createCollection("notes");
}
db = db.getSiblingDB("admin");

const addShardIfMissing = (name, host) => {
  const shards = db.adminCommand({ listShards: 1 }).shards || [];
  if (shards.some((item) => item._id === name)) {
    print(`[init] ${name} already added.`);
    return;
  }
  printjson(sh.addShard(host));
};

addShardIfMissing("shard1rs", "shard1rs/shard1a:27018,shard1b:27018,shard1c:27018");
addShardIfMissing("shard2rs", "shard2rs/shard2a:27018,shard2b:27018,shard2c:27018");
addShardIfMissing("shard3rs", "shard3rs/shard3a:27018,shard3b:27018,shard3c:27018");

try {
  printjson(sh.enableSharding("mowndark"));
} catch (e) {
  if (!e.message || e.message.indexOf("already enabled") === -1) {
    print(`[init] enableSharding warning: ${e.message}`);
  }
}

try {
  printjson(sh.shardCollection("mowndark.notes", { _id: "hashed" }));
} catch (e) {
  if (!e.message || e.message.indexOf("already sharded") === -1) {
    print(`[init] shardCollection warning: ${e.message}`);
  }
}
EOF

mongosh --host mongos --port 27017 "${AUTH[@]}" <<EOF
db = db.getSiblingDB('mowndark');

try {
  db.createUser({
    user: "${MONGO_APP_USER}",
    pwd: "${MONGO_APP_PASSWORD}",
    roles: [
      { role: "readWrite", db: "mowndark" },
      { role: "clusterMonitor", db: "admin" }
    ]
  });
} catch (e) {
  if (e.codeName === "DuplicateKey" || (e.message && e.message.indexOf("already exists") !== -1)) {
    db.updateUser("${MONGO_APP_USER}", {
      roles: [
        { role: "readWrite", db: "mowndark" },
        { role: "clusterMonitor", db: "admin" }
      ]
    });
  } else {
    throw e;
  }
}

const collections = ["users", "notes", "images"];
const existing = db.getCollectionNames();
for (const name of collections) {
  if (!existing.includes(name)) {
    db.createCollection(name);
  }
}

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true, sparse: true });
db.notes.createIndex({ shortid: 1 }, { sparse: true });
db.notes.createIndex({ alias: 1 }, { sparse: true });
db.notes.createIndex({ owner_id: 1 });
db.notes.createIndex({ permission: 1 });
db.notes.createIndex({ title: 1 });
db.notes.createIndex({ created_at: -1 });
db.notes.createIndex({ updated_at: -1 });
db.images.createIndex({ note_id: 1 });
db.images.createIndex({ uploaded_by: 1 });
db.images.createIndex({ created_at: -1 });
EOF

echo "[init] Cluster ready."
