const database = db.getSiblingDB('mowndark_sharding_test');
database.events.drop();

printjson(sh.enableSharding('mowndark_sharding_test'));
database.events.createIndex({ userId: 1 });
printjson(sh.shardCollection('mowndark_sharding_test.events', { userId: 1 }));

for (const splitAt of [3000, 6000]) {
  try {
    printjson(sh.splitAt('mowndark_sharding_test.events', { userId: splitAt }));
  } catch (error) {
    print(`splitAt warning: ${error.message}`);
  }
}

for (const move of [
  { key: { userId: 1000 }, shard: 'rs0' },
  { key: { userId: 4000 }, shard: 'rs1' },
  { key: { userId: 7000 }, shard: 'rs2' },
]) {
  try {
    printjson(sh.moveChunk('mowndark_sharding_test.events', move.key, move.shard));
  } catch (error) {
    print(`moveChunk warning: ${error.message}`);
  }
}

const docs = [];
for (let i = 0; i < 12000; i += 1) {
  docs.push({ userId: i, kind: 'sharding-smoke', createdAt: new Date() });
  if (docs.length === 1000) {
    database.events.insertMany(docs);
    docs.length = 0;
  }
}
if (docs.length) {
  database.events.insertMany(docs);
}

print(`count=${database.events.countDocuments()}`);
printjson(db.adminCommand({ listShards: 1 }));
printjson(database.events.aggregate([{ $collStats: { storageStats: {} } }]).toArray());
