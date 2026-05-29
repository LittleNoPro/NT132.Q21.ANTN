const cfg = {
  _id: 'rs1',
  members: [
    { _id: 0, host: 'shard10:27017' },
    { _id: 1, host: 'shard11:27017' },
    { _id: 2, host: 'shard12:27017' },
  ],
};

try {
  const status = rs.status();
  print(`rs1 already initialized: ${status.set}`);
} catch (error) {
  if (String(error).includes('no replset config has been received')) {
    printjson(rs.initiate(cfg));
  } else {
    print(error);
    quit(1);
  }
}
