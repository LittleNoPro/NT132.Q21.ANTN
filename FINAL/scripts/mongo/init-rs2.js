const cfg = {
  _id: 'rs2',
  members: [
    { _id: 0, host: 'shard20:27017' },
    { _id: 1, host: 'shard21:27017' },
    { _id: 2, host: 'shard22:27017' },
  ],
};

try {
  const status = rs.status();
  print(`rs2 already initialized: ${status.set}`);
} catch (error) {
  if (String(error).includes('no replset config has been received')) {
    printjson(rs.initiate(cfg));
  } else {
    print(error);
    quit(1);
  }
}
