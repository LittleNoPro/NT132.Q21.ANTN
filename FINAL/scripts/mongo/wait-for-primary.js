const deadline = Date.now() + 60000;

while (Date.now() < deadline) {
  try {
    const status = rs.status();
    const states = status.members.map((member) => `${member.name}=${member.stateStr}`).join(', ');
    print(states);
    if (status.members.some((member) => member.stateStr === 'PRIMARY')) {
      quit(0);
    }
  } catch (error) {
    print(`waiting: ${error.message}`);
  }
  sleep(1000);
}

print('No primary elected before timeout');
quit(1);
