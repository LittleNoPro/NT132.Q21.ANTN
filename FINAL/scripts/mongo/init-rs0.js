const cfg = {
  _id: 'rs0',
  members: [
    { _id: 0, host: 'shard00:27017' },
    { _id: 1, host: 'shard01:27017' },
    { _id: 2, host: 'shard02:27017' },
  ],
};

try {
  const status = rs.status();
  print(`rs0 already initialized: ${status.set}`);
} catch (error) {
  if (String(error).includes('no replset config has been received')) {
    printjson(rs.initiate(cfg));
  } else {
    print(error);
    quit(1);
  }
}
