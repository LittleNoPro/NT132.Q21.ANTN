const shardSpecs = [
  { id: 'rs0', host: 'rs0/shard00:27017,shard01:27017,shard02:27017' },
  { id: 'rs1', host: 'rs1/shard10:27017,shard11:27017,shard12:27017' },
  { id: 'rs2', host: 'rs2/shard20:27017,shard21:27017,shard22:27017' },
];

const list = db.adminCommand({ listShards: 1 });
if (!list.ok) {
  printjson(list);
  quit(1);
}

const existing = list.shards.map((shard) => shard._id);
for (const shardSpec of shardSpecs) {
  if (existing.includes(shardSpec.id)) {
    print(`Shard ${shardSpec.id} is already registered`);
    continue;
  }
  printjson(sh.addShard(shardSpec.host));
}

printjson(db.adminCommand({ listShards: 1 }));
sh.status();
