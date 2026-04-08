# Mongo Cluster Setup Guide

This is a cleaned-up version of `script.md` with short notes for each step. The layout is:

- `mongo1`: shard 1 replica set
- `mongo2`: shard 2 replica set
- `mongo3`: shard 3 replica set
- `config`: config server replica set
- `mongos`: router for the whole sharded cluster

Use the same keyfile on every machine, make sure hostnames (`mongo1`, `mongo2`, `mongo3`, `config`, `mongos`) resolve correctly, and run the commands on the host named in each section.

## 1. Shared keyfile

Create the keyfile once, then copy it to every node.

```bash
mkdir -p /home/winky/data
openssl rand -base64 756 > /home/winky/data/keyfile
sudo chmod 400 /home/winky/data/keyfile
sudo chown mongodb:mongodb /home/winky/data/keyfile
```

Copy it to the other machines:

```bash
sudo scp /home/winky/data/keyfile winky@mongo2:/home/winky/data/keyfile
sudo scp /home/winky/data/keyfile winky@mongo3:/home/winky/data/keyfile
sudo scp /home/winky/data/keyfile winky@config:/home/winky/data/keyfile
sudo scp /home/winky/data/keyfile winky@mongos:/home/winky/data/keyfile
```

## 2. `mongo1` for shard 1

Prepare three `mongod` instances for the first shard replica set.

```bash
mkdir -p /home/winky/data/shard1/rs1/{db,log}
mkdir -p /home/winky/data/shard1/rs2/{db,log}
mkdir -p /home/winky/data/shard1/rs3/{db,log}
mkdir -p /home/winky/data/conf
```

```bash
cat > /home/winky/data/conf/shard1-27018.conf <<'EOF'
storage:
  dbPath: /home/winky/data/shard1/rs1/db
systemLog:
  destination: file
  path: /home/winky/data/shard1/rs1/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27018
processManagement:
  fork: true
replication:
  replSetName: shard1rs
sharding:
  clusterRole: shardsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

```bash
cat > /home/winky/data/conf/shard1-27019.conf <<'EOF'
storage:
  dbPath: /home/winky/data/shard1/rs2/db
systemLog:
  destination: file
  path: /home/winky/data/shard1/rs2/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27019
processManagement:
  fork: true
replication:
  replSetName: shard1rs
sharding:
  clusterRole: shardsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

```bash
cat > /home/winky/data/conf/shard1-27020.conf <<'EOF'
storage:
  dbPath: /home/winky/data/shard1/rs3/db
systemLog:
  destination: file
  path: /home/winky/data/shard1/rs3/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27020
processManagement:
  fork: true
replication:
  replSetName: shard1rs
sharding:
  clusterRole: shardsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

Start shard 1:

```bash
sudo mongod -f /home/winky/data/conf/shard1-27018.conf
sudo mongod -f /home/winky/data/conf/shard1-27019.conf
sudo mongod -f /home/winky/data/conf/shard1-27020.conf
```

Initiate the replica set:

```javascript
mongosh --host mongo1 --port 27018

rs.initiate({
  _id: "shard1rs",
  members: [
    { _id: 0, host: "mongo1:27018" },
    { _id: 1, host: "mongo1:27019" },
    { _id: 2, host: "mongo1:27020" }
  ]
})
```

## 3. `mongo2` for shard 2

Do the same layout for shard 2, but use `/home/winky/data/shard2/...` and `replSetName: shard2rs` in the config files.

```bash
mkdir -p /home/winky/data
mkdir -p /home/winky/data/shard2/rs1/{db,log}
mkdir -p /home/winky/data/shard2/rs2/{db,log}
mkdir -p /home/winky/data/shard2/rs3/{db,log}
mkdir -p /home/winky/data/conf
```

Start shard 2:

```bash
sudo mongod -f /home/winky/data/conf/shard2-27018.conf
sudo mongod -f /home/winky/data/conf/shard2-27019.conf
sudo mongod -f /home/winky/data/conf/shard2-27020.conf
```

Initiate the replica set:

```javascript
mongosh --host mongo2 --port 27018

rs.initiate({
  _id: "shard2rs",
  members: [
    { _id: 0, host: "mongo2:27018" },
    { _id: 1, host: "mongo2:27019" },
    { _id: 2, host: "mongo2:27020" }
  ]
})
```

## 4. `config` for config servers

Bring up the config server replica set before starting `mongos`.

```bash
mkdir -p /home/winky/data/config/cfg1/{db,log}
mkdir -p /home/winky/data/config/cfg2/{db,log}
mkdir -p /home/winky/data/config/cfg3/{db,log}
mkdir -p /home/winky/data/config/conf
```

```bash
cat > /home/winky/data/config/conf/cfg1.conf <<'EOF'
storage:
  dbPath: /home/winky/data/config/cfg1/db
systemLog:
  destination: file
  path: /home/winky/data/config/cfg1/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27019
processManagement:
  fork: true
replication:
  replSetName: configReplSet
sharding:
  clusterRole: configsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

```bash
cat > /home/winky/data/config/conf/cfg2.conf <<'EOF'
storage:
  dbPath: /home/winky/data/config/cfg2/db
systemLog:
  destination: file
  path: /home/winky/data/config/cfg2/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27020
processManagement:
  fork: true
replication:
  replSetName: configReplSet
sharding:
  clusterRole: configsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

```bash
cat > /home/winky/data/config/conf/cfg3.conf <<'EOF'
storage:
  dbPath: /home/winky/data/config/cfg3/db
systemLog:
  destination: file
  path: /home/winky/data/config/cfg3/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27021
processManagement:
  fork: true
replication:
  replSetName: configReplSet
sharding:
  clusterRole: configsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

Start config servers:

```bash
sudo mongod -f /home/winky/data/config/conf/cfg1.conf
sudo mongod -f /home/winky/data/config/conf/cfg2.conf
sudo mongod -f /home/winky/data/config/conf/cfg3.conf
```

Initiate the config replica set:

```javascript
mongosh --port 27019 --host config

rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "config:27019" },
    { _id: 1, host: "config:27020" },
    { _id: 2, host: "config:27021" }
  ]
})
```

## 5. `mongos` router

Configure the router after the config replica set is ready.

```bash
mkdir -p /home/winky/data/mongos/{log,conf}
```

```bash
cat > /home/winky/data/mongos/conf/mongos.conf <<'EOF'
systemLog:
  destination: file
  path: /home/winky/data/mongos/log/mongos.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27017
processManagement:
  fork: true
sharding:
  configDB: configReplSet/config:27019,config:27020,config:27021
security:
  keyFile: /home/winky/data/keyfile
EOF
```

Start `mongos`:

```bash
mongos -f /home/winky/data/mongos/conf/mongos.conf
```

Connect to the router:

```bash
mongosh --host mongos --port 27017
```

Add shards:

```javascript
sh.addShard("shard1rs/mongo1:27018,mongo1:27019,mongo1:27020")
sh.addShard("shard2rs/mongo2:27018,mongo2:27019,mongo2:27020")
```

Create the admin user:

```javascript
use admin

db.createUser({
  user: "admin",
  pwd: "Admin@123",
  roles: [
    { role: "root", db: "admin" },
    { role: "clusterAdmin", db: "admin" },
    { role: "userAdminAnyDatabase", db: "admin" }
  ]
})
```

After the admin user exists, reconnect with authentication:

```bash
mongosh --host mongos --port 27017 -u admin -p 'Admin@123' --authenticationDatabase admin
```

## 6. `mongo3` for shard 3

This is the same pattern as shard 1 and shard 2, but for `shard3rs`.

```bash
mkdir -p /home/winky/data
mkdir -p /home/winky/data/shard3/rs1/{db,log}
mkdir -p /home/winky/data/shard3/rs2/{db,log}
mkdir -p /home/winky/data/shard3/rs3/{db,log}
mkdir -p /home/winky/data/conf
```

```bash
cat > /home/winky/data/conf/shard3-27018.conf <<'EOF'
storage:
  dbPath: /home/winky/data/shard3/rs1/db
systemLog:
  destination: file
  path: /home/winky/data/shard3/rs1/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27018
processManagement:
  fork: true
replication:
  replSetName: shard3rs
sharding:
  clusterRole: shardsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

```bash
cat > /home/winky/data/conf/shard3-27019.conf <<'EOF'
storage:
  dbPath: /home/winky/data/shard3/rs2/db
systemLog:
  destination: file
  path: /home/winky/data/shard3/rs2/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27019
processManagement:
  fork: true
replication:
  replSetName: shard3rs
sharding:
  clusterRole: shardsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

```bash
cat > /home/winky/data/conf/shard3-27020.conf <<'EOF'
storage:
  dbPath: /home/winky/data/shard3/rs3/db
systemLog:
  destination: file
  path: /home/winky/data/shard3/rs3/log/mongod.log
  logAppend: true
net:
  bindIp: 0.0.0.0
  port: 27020
processManagement:
  fork: true
replication:
  replSetName: shard3rs
sharding:
  clusterRole: shardsvr
security:
  keyFile: /home/winky/data/keyfile
EOF
```

Start shard 3:

```bash
sudo mongod -f /home/winky/data/conf/shard3-27018.conf
sudo mongod -f /home/winky/data/conf/shard3-27019.conf
sudo mongod -f /home/winky/data/conf/shard3-27020.conf
```

Initiate the replica set:

```javascript
mongosh --host mongo3 --port 27018

rs.initiate({
  _id: "shard3rs",
  members: [
    { _id: 0, host: "mongo3:27018" },
    { _id: 1, host: "mongo3:27019" },
    { _id: 2, host: "mongo3:27020" }
  ]
})
```

Add shard 3 to the cluster:

```javascript
sh.addShard("shard3rs/mongo3:27018,mongo3:27019,mongo3:27020")
```

## 7. Useful admin commands

Remove shard 3:

```javascript
db.adminCommand({ removeShard: "shard3rs" })
```

Balancer control:

```javascript
sh.stopBalancer()
sh.startBalancer()
```

## 8. Start order

If you need to restart everything manually, use this order:

```bash
sudo mongod -f /home/winky/data/config/conf/cfg1.conf
sudo mongod -f /home/winky/data/config/conf/cfg2.conf
sudo mongod -f /home/winky/data/config/conf/cfg3.conf

sudo mongod -f /home/winky/data/conf/shard1-27018.conf
sudo mongod -f /home/winky/data/conf/shard1-27019.conf
sudo mongod -f /home/winky/data/conf/shard1-27020.conf

sudo mongod -f /home/winky/data/conf/shard2-27018.conf
sudo mongod -f /home/winky/data/conf/shard2-27019.conf
sudo mongod -f /home/winky/data/conf/shard2-27020.conf

sudo mongod -f /home/winky/data/conf/shard3-27018.conf
sudo mongod -f /home/winky/data/conf/shard3-27019.conf
sudo mongod -f /home/winky/data/conf/shard3-27020.conf

mongos -f /home/winky/data/mongos/conf/mongos.conf
```
