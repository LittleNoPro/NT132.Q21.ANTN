const cfg = {
  _id: 'configRs',
  configsvr: true,
  members: [
    { _id: 0, host: 'configsvr0:27017' },
    { _id: 1, host: 'configsvr1:27017' },
    { _id: 2, host: 'configsvr2:27017' },
  ],
};

try {
  const status = rs.status();
  print(`configRs already initialized: ${status.set}`);
} catch (error) {
  if (String(error).includes('no replset config has been received')) {
    printjson(rs.initiate(cfg));
  } else {
    print(error);
    quit(1);
  }
}
