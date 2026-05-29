const appDb = db.getSiblingDB('mowndark');

for (const name of ['users', 'notes', 'images', 'audit_logs', 'write_concern_demo', 'backups_metadata']) {
  if (!appDb.getCollectionNames().includes(name)) {
    appDb.createCollection(name);
  }
}

function ensureIndex(collection, keys, options = {}) {
  const indexName = options.name || Object.entries(keys).map(([key, value]) => `${key}_${value}`).join('_');
  const existing = collection.getIndexes().some((index) => index.name === indexName);
  if (existing) {
    print(`Index ${collection.getName()}.${indexName} already exists`);
    return;
  }
  collection.createIndex(keys, options);
}

ensureIndex(appDb.users, { email: 1 }, { unique: true });
ensureIndex(appDb.users, { username: 1 }, { unique: true, sparse: true });
ensureIndex(appDb.notes, { shortid: 1 }, { sparse: true });
ensureIndex(appDb.notes, { alias: 1 }, { sparse: true });
ensureIndex(appDb.notes, { owner_id: 1 });
ensureIndex(appDb.notes, { permission: 1 });
ensureIndex(appDb.notes, { updated_at: -1 });
ensureIndex(appDb.notes, { title: 'text', content: 'text' }, {
  name: 'notes_text_search',
  weights: { title: 10, content: 1 },
});
ensureIndex(appDb.images, { note_id: 1 });
ensureIndex(appDb.images, { uploaded_by: 1 });
ensureIndex(appDb.images, { created_at: -1 });
ensureIndex(appDb.audit_logs, { created_at: -1 });
ensureIndex(appDb.write_concern_demo, { batchId: 1, mode: 1, sequence: 1 }, { name: 'usecase8_batch_mode_sequence' });

try {
  printjson(sh.enableSharding('mowndark'));
} catch (error) {
  if (!String(error).includes('already enabled')) {
    print(`enableSharding warning: ${error.message}`);
  }
}

try {
  printjson(sh.shardCollection('mowndark.notes', { shortid: 1 }));
} catch (error) {
  if (!String(error).includes('already sharded')) {
    print(`notes shardCollection warning: ${error.message}`);
  }
}

try {
  printjson(sh.shardCollection('mowndark.images', { _id: 'hashed' }));
} catch (error) {
  if (!String(error).includes('already sharded')) {
    print(`images shardCollection warning: ${error.message}`);
  }
}

try {
  printjson(sh.shardCollection('mowndark.audit_logs', { _id: 'hashed' }));
} catch (error) {
  if (!String(error).includes('already sharded')) {
    print(`audit_logs shardCollection warning: ${error.message}`);
  }
}

printjson(db.adminCommand({ listShards: 1 }));
