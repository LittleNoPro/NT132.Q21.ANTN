const database = db.getSiblingDB('mowndark');
const now = new Date();
const resetNotes =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.RESET_NOTES === '1';
const seedTag = 'security_ctf_seed_v2';

const notes = [
  {
    shortid: 'seedweb001',
    alias: 'broken-access-control-notes',
    title: 'Broken Access Control and IDOR Notes',
    tags: ['owasp', 'idor', 'access-control'],
    source_url: 'https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/index.html',
    content: `# Broken Access Control and IDOR Notes

Broken access control bugs happen when the server trusts the client too much. In CTFs this often shows up as an insecure direct object reference, where changing a numeric ID, UUID, or filename reveals another user's data.

## What to test

- Replace object IDs in URLs, forms, and JSON bodies.
- Change organization, project, invoice, or profile identifiers.
- Try vertical privilege jumps like \`role=user\` to \`role=admin\`.
- Look for hidden buttons that still work if the request is replayed manually.

## Fast checklist

- Can I read another user's resource?
- Can I edit or delete it?
- Does the API check ownership on every request?
- Are admin-only endpoints blocked server-side?

## CTF angle

IDOR challenges often hide the flag in another user's draft, support ticket, or exported file. Enumerating predictable IDs and replaying API calls is usually enough to win quickly.`,
  },
  {
    shortid: 'seedweb002',
    alias: 'sqli-playbook',
    title: 'SQL Injection Playbook',
    tags: ['web', 'sqli', 'database'],
    source_url: 'https://portswigger.net/web-security/sql-injection',
    content: `# SQL Injection Playbook

SQL injection appears when user input is concatenated into a query instead of being handled safely. In CTFs the target is usually login bypass, dumping interesting tables, or using the database as a pivot.

## First probes

- Single quote, double quote, backslash
- Boolean checks like \`' OR 1=1 --\`
- Order by and union tests
- Time-based payloads when errors are hidden

## Useful workflow

1. Find where input reaches SQL.
2. Learn the column count.
3. Confirm visible output or timing side channel.
4. Enumerate schema, then hunt for flags, creds, or API keys.

## Defender mindset

Prepared statements, strict allow-lists, and least-privilege database accounts make this category much harder to exploit.`,
  },
  {
    shortid: 'seedweb003',
    alias: 'xss-hunting-notes',
    title: 'XSS Hunting Notes',
    tags: ['web', 'xss', 'javascript'],
    source_url: 'https://portswigger.net/web-security/cross-site-scripting',
    content: `# XSS Hunting Notes

Cross-site scripting turns reflected, stored, or DOM-controlled input into script execution in a victim browser. In CTFs the goal is commonly cookie theft, admin bot takeover, or internal action replay.

## Places to look

- Search boxes, comments, profile fields
- Markdown preview features
- Query string to DOM sinks like \`innerHTML\`
- Error messages and template fragments

## Quick questions

- Is output inside HTML, an attribute, JavaScript, or a URL?
- Is any sanitization context-aware?
- Can I break out with a quote, tag, or event handler?

## CTF angle

If an admin bot visits your payload, keep the exploit short and reliable. Stored XSS in notes or support messages is usually worth testing first.`,
  },
  {
    shortid: 'seedweb004',
    alias: 'path-traversal-checklist',
    title: 'Path Traversal Checklist',
    tags: ['web', 'path-traversal', 'files'],
    source_url: 'https://portswigger.net/web-security/file-path-traversal',
    content: `# Path Traversal Checklist

Path traversal lets an attacker escape the intended directory and read or sometimes overwrite arbitrary files. PortSwigger highlights classic targets like application files, credentials, and operating system data.

## Common payload patterns

- \`../../../etc/passwd\`
- \`..\\\\..\\\\..\\\\windows\\\\win.ini\`
- Absolute paths when traversal filters fail
- Double encoding or nested traversal when sanitization is weak

## High-value files

- App config files
- Source code
- SSH keys or service tokens
- Flag files placed outside the web root

## CTF angle

If the app serves images or downloads by filename, path traversal is often the intended shortcut to the flag.`,
  },
  {
    shortid: 'seedweb005',
    alias: 'ssrf-recon-notes',
    title: 'SSRF Recon Notes',
    tags: ['web', 'ssrf', 'cloud'],
    source_url: 'https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/index.html',
    content: `# SSRF Recon Notes

OWASP describes SSRF as a bug where the application fetches a remote resource without properly validating the user-supplied URL. The dangerous part is that the server can often reach internal systems that you cannot.

## What to try

- \`http://127.0.0.1\`
- Internal hostnames and RFC1918 ranges
- Cloud metadata endpoints
- Alternate schemes, redirects, and DNS tricks

## What good SSRF gives you

- Access to internal admin panels
- Cloud credentials
- Service banners and port discovery
- Pivoting to secondary bugs

## Defense hints

Allow-list destinations, restrict outbound traffic, disable unsafe redirects, and avoid reflecting raw upstream responses.`,
  },
  {
    shortid: 'seedweb006',
    alias: 'csrf-attack-surface',
    title: 'CSRF Attack Surface',
    tags: ['web', 'csrf', 'auth'],
    source_url: 'https://portswigger.net/web-security/csrf',
    content: `# CSRF Attack Surface

Cross-site request forgery abuses the browser's habit of automatically sending cookies. In a CTF, it usually matters when an admin visits attacker-controlled content and unknowingly performs a state-changing action.

## Look for

- Missing CSRF tokens
- Tokens that are not tied to the session
- Tokens present on forms but ignored by the backend
- Endpoints that accept GET for state changes

## High-value actions

- Change email or password
- Promote a user
- Add an SSH key
- Trigger an export or flag reveal action

## Lab habit

When you find stored XSS, always check whether it can be chained into CSRF-style admin actions for a more reliable solve.`,
  },
  {
    shortid: 'seedweb007',
    alias: 'file-upload-abuse',
    title: 'File Upload Abuse Notes',
    tags: ['web', 'uploads', 'rce'],
    source_url: 'https://portswigger.net/web-security/file-upload',
    content: `# File Upload Abuse Notes

Upload features are dangerous because they mix user-controlled content, parsing, storage, and later retrieval. In CTFs, the intended route is often code execution through a script upload or a validation bypass.

## Test ideas

- Change extension, MIME type, or magic bytes
- Double extensions like \`.php.jpg\`
- SVG or HTML uploads for stored XSS
- Path tricks in filenames

## Questions to answer

- Is the file executed or just stored?
- Is it renamed safely?
- Can I reach the uploaded file directly?
- Are image processors or document converters running on it?

## Defender view

Store uploads outside the executable path, rewrite names, verify content server-side, and serve from a separate domain when possible.`,
  },
  {
    shortid: 'seedweb008',
    alias: 'jwt-attack-notes',
    title: 'JWT Attack Notes',
    tags: ['web', 'jwt', 'auth'],
    source_url: 'https://portswigger.net/web-security/jwt',
    content: `# JWT Attack Notes

PortSwigger points out that JWT issues often become high-severity because these tokens sit inside authentication and access-control flows. If the server verifies them incorrectly, the whole app can fall over.

## Things to inspect

- \`alg\` handling
- Acceptance of unsigned tokens
- Weak symmetric secrets
- Dangerous header parameters like \`jku\`, \`jwk\`, or \`kid\`

## CTF workflow

1. Decode the token.
2. Look for editable claims like \`admin\`, \`role\`, or \`user_id\`.
3. Check signature handling and key confusion opportunities.
4. Replay the modified token against privileged endpoints.

## Good reminder

Client-stored claims are not trustworthy by default. The backend has to verify both the signature and the authorization decision.`,
  },
  {
    shortid: 'seedweb009',
    alias: 'ssti-crash-course',
    title: 'Server-Side Template Injection Crash Course',
    tags: ['web', 'ssti', 'templates'],
    source_url: 'https://portswigger.net/web-security/server-side-template-injection',
    content: `# Server-Side Template Injection Crash Course

PortSwigger describes SSTI as the moment user input is concatenated into the template itself instead of being passed in as data. That turns template syntax into a code execution primitive on the server side.

## Why it matters

- Template directives execute server-side
- The impact can escalate to file reads or remote code execution
- Even partial template control can leak secrets and environment data

## CTF pattern

Profile themes, email templates, preview pages, and custom rendering features are classic SSTI targets.

## Fast checks

- Try arithmetic expressions in the suspected template context
- Identify the engine from error messages or syntax behavior
- Enumerate available objects before going for execution`,
  },
  {
    shortid: 'seedweb010',
    alias: 'command-injection-workflow',
    title: 'Command Injection Workflow',
    tags: ['web', 'command-injection', 'shell'],
    source_url: 'https://owasp.org/Top10/2021/A03_2021-Injection/index.html',
    content: `# Command Injection Workflow

Command injection shows up when the application builds a shell command from unsanitized input. In CTFs, this is often the shortest path from a small form field to a shell on the target.

## Starter payload ideas

- Separator tests such as \`;\`, \`&&\`, or \`|\`
- Blind output via timing or DNS
- Input that reaches ping, convert, grep, or archive commands

## Practical goals

- Read the flag file
- Exfil environment variables
- Enumerate users and interesting paths
- Drop into a more stable reverse shell if allowed

## Rule of thumb

If a feature feels like a thin wrapper around a system utility, test for shell metacharacters early.`,
  },
  {
    shortid: 'seedbin001',
    alias: 'buffer-overflow-primer',
    title: 'Buffer Overflow Primer',
    tags: ['pwn', 'buffer-overflow', 'stack'],
    source_url: 'https://ctf101.org/binary-exploitation/buffer-overflow/',
    content: `# Buffer Overflow Primer

CTF101 explains buffer overflows as writes that exceed the space allocated for a buffer and overwrite nearby data. On the stack, that can mean corrupting a secret variable, saved frame pointer, or saved return address.

## Core concepts

- Measure the offset precisely
- Think in little-endian
- Separate data control from instruction control
- Expect mitigations like NX and ASLR later

## Typical CTF path

1. Crash the program.
2. Find the overwrite offset.
3. Prove control over a variable or RIP/EIP.
4. Redirect execution to a win function or chain.

## Why beginners like it

The feedback loop is immediate: crash, inspect, adjust, repeat.`,
  },
  {
    shortid: 'seedbin002',
    alias: 'format-string-notes',
    title: 'Format String Exploitation Notes',
    tags: ['pwn', 'format-string', 'memory'],
    source_url: 'https://ctf101.org/binary-exploitation/buffer-overflow/',
    content: `# Format String Exploitation Notes

Format string bugs appear when attacker-controlled input is treated as the format string itself. In CTFs, they are excellent for leaks and sometimes direct writes.

## Fast goals

- Leak stack values with \`%p\`
- Read arbitrary memory with \`%s\`
- Use \`%n\` carefully for writes when the challenge allows it

## Practical checklist

- Find where your input lands in the argument list
- Leak libc, PIE, or stack addresses
- Convert the leak into a stable second-stage exploit

## Why it matters

Even when control flow is protected, a single good memory leak can collapse ASLR and make the rest of the exploit straightforward.`,
  },
  {
    shortid: 'seedbin003',
    alias: 'rop-basics',
    title: 'ROP Chain Basics',
    tags: ['pwn', 'rop', 'nx'],
    source_url: 'https://ctf101.org/binary-exploitation/buffer-overflow/',
    content: `# ROP Chain Basics

Return-oriented programming is the answer when direct shellcode injection is blocked by NX. Instead of injecting fresh instructions, you stitch together tiny instruction sequences that already exist inside the binary or linked libraries.

## Mental model

- Leak an address
- Resolve the base
- Find gadgets
- Satisfy the calling convention

## Minimal wins

- Call \`system("/bin/sh")\`
- Return to a hidden win function
- Use the PLT/GOT to resolve library calls

## CTF habit

Keep your first chain small. A short, clean ret2libc is usually better than an ambitious gadget maze.`,
  },
  {
    shortid: 'seedbin004',
    alias: 'assembly-reversing-notes',
    title: 'Assembly Reversing Notes',
    tags: ['reversing', 'assembly', 'x86-64'],
    source_url: 'https://ctf101.org/reverse-engineering/what-is-assembly-machine-code/',
    content: `# Assembly Reversing Notes

CTF101 frames assembly as the direct representation of what the CPU executes. For reversing, that means every comparison, jump, and memory access matters.

## Focus points

- Registers used for arguments and return values
- Conditional jumps around checks
- Loops that transform bytes
- String comparisons and XOR routines

## Good workflow

1. Find \`main\` or the interesting function.
2. Mark user input entry points.
3. Track comparisons and transformations.
4. Recreate the logic in a script when needed.

## CTF benefit

A little assembly fluency turns scary binaries into readable puzzles.`,
  },
  {
    shortid: 'seedfor002',
    alias: 'memory-forensics-volatility',
    title: 'Memory Forensics with Volatility',
    tags: ['forensics', 'memory', 'volatility'],
    source_url: 'https://ctf101.org/forensics/what-is-memory-forensics/',
    content: `# Memory Forensics with Volatility

CTF101 recommends a practical flow for RAM analysis: run \`strings\` for clues, identify the profile, inspect processes, then dump suspicious process memory. That sequence keeps you from drowning in raw memory too early.

## Useful steps

1. Identify the image profile.
2. Enumerate processes with \`pslist\`, \`pstree\`, or \`psscan\`.
3. Dump suspicious processes.
4. Analyze the dumped content in the format that fits it.

## What memory often reveals

- Cleartext commands
- Unsaved notes
- Malware config
- Network indicators

## CTF angle

When disk artifacts are thin, memory dumps often contain the only direct trace of the attacker or the hidden flag text.`,
  },
  {
    shortid: 'seedfor003',
    alias: 'wireshark-filters',
    title: 'Wireshark Filters That Save Time',
    tags: ['forensics', 'network', 'wireshark'],
    source_url: 'https://ctf101.org/',
    content: `# Wireshark Filters That Save Time

Wireshark challenges are easier when you filter aggressively instead of scrolling blindly through every packet.

## Filters worth memorizing

- \`http\`
- \`dns\`
- \`tcp.stream eq N\`
- \`ip.addr == x.x.x.x\`
- \`frame contains "flag"\`

## What to look for

- Credentials in cleartext protocols
- Suspicious user agents
- Reassembled HTTP objects
- Beaconing patterns
- Exfil staged over DNS or HTTP

## CTF reminder

Following streams is often faster than packet-by-packet inspection.`,
  },
  {
    shortid: 'seedfor004',
    alias: 'pcap-triage',
    title: 'Packet Capture Triage',
    tags: ['forensics', 'pcap', 'network'],
    source_url: 'https://ctf101.org/forensics/what-is-packet-capture/',
    content: `# Packet Capture Triage

Packet captures preserve network conversations exactly as they crossed the wire. In CTFs they frequently hide credentials, transferred files, or the flag itself inside an application protocol.

## Triage plan

- Identify the busiest hosts
- Separate client and server roles
- Follow interesting TCP streams
- Reassemble files and exports
- Check DNS, HTTP, FTP, SMTP, and custom ports

## Common wins

- Basic auth credentials
- Session cookies
- Downloaded malware samples
- Encoded blobs inside POST requests

## Tip

Start broad, then narrow. The first job is finding the interesting conversation, not decoding everything at once.`,
  },
  {
    shortid: 'seedcry001',
    alias: 'xor-basics',
    title: 'XOR Basics for CTFs',
    tags: ['crypto', 'xor', 'ctf'],
    source_url: 'https://ctf101.org/',
    content: `# XOR Basics for CTFs

XOR shows up everywhere because it is simple, reversible, and easy to hide inside scripts or binaries. The same operation both encrypts and decrypts when the key is known.

## Practical habits

- Check for single-byte XOR when text looks almost readable
- Look for repeating-key patterns
- Try crib dragging when you know part of the plaintext
- Convert bytes carefully before doing frequency analysis

## Why it matters

Many crypto and reversing challenges become easy once you realize the author only wrapped the flag with a lightweight XOR transform.`,
  },
  {
    shortid: 'seedcry002',
    alias: 'stream-cipher-keystream-reuse',
    title: 'Stream Cipher Keystream Reuse',
    tags: ['crypto', 'stream-cipher', 'xor'],
    source_url: 'https://ctf101.org/cryptography/what-are-stream-ciphers/',
    content: `# Stream Cipher Keystream Reuse

CTF101 emphasizes the main rule of stream ciphers: never reuse the same keystream. Because encryption is typically based on XOR, combining two ciphertexts can cancel the keystream and reveal relationships between plaintexts.

## What to remember

- Same keystream means the problem is probably recoverable
- Known plaintext can unlock the rest
- Bit-flipping attacks matter when integrity is missing

## CTF angle

If two ciphertexts look related, test whether XORing them together leaks structure. That shortcut wins a lot of beginner and intermediate crypto challenges.`,
  },
  {
    shortid: 'seedcry003',
    alias: 'rsa-attack-notes',
    title: 'RSA Attack Notes',
    tags: ['crypto', 'rsa', 'number-theory'],
    source_url: 'https://ctf101.org/cryptography/what-is-rsa/',
    content: `# RSA Attack Notes

RSA challenges rarely require breaking a healthy key from scratch. The usual trick is finding a bad parameter choice or a leaked relationship between values.

## Things to inspect

- Small public exponent edge cases
- Shared primes across keys
- Weak padding assumptions
- Partial prime leakage
- Factoring hints hidden in the challenge text

## Useful mindset

Translate the story into equations first. Once the algebra is clear, a short script is often enough to finish the solve.

## CTF rule

When you see RSA, ask what the author intentionally made unsafe.`,
  },
];

function ensureIndexes() {
  database.users.createIndex({ email: 1 }, { unique: true, background: true });
  database.users.createIndex({ username: 1 }, { unique: true, sparse: true, background: true });
  database.notes.createIndex({ shortid: 1 }, { sparse: true, background: true });
  database.notes.createIndex({ alias: 1 }, { sparse: true, background: true });
  database.notes.createIndex({ owner_id: 1 }, { background: true });
  database.notes.createIndex({ permission: 1 }, { background: true });
  database.notes.createIndex({ created_at: -1 }, { background: true });
  database.notes.createIndex({ updated_at: -1 }, { background: true });
  database.notes.createIndex({ seed_tag: 1 }, { background: true });
  database.images.createIndex({ note_id: 1 }, { background: true });
  database.images.createIndex({ uploaded_by: 1 }, { background: true });
  database.images.createIndex({ created_at: -1 }, { background: true });
}

function resetExistingNotes() {
  if (!resetNotes) {
    return;
  }

  const removedImages = database.images.deleteMany({});
  const removedNotes = database.notes.deleteMany({});
  print(`[init] Removed ${removedNotes.deletedCount} note(s).`);
  print(`[init] Removed ${removedImages.deletedCount} image record(s).`);
}

function seedNotes() {
  let inserted = 0;
  let updated = 0;

  for (const note of notes) {
    const filter = { alias: note.alias };
    const existing = database.notes.findOne(filter, { _id: 1 });
    const document = {
      ...note,
      seed_tag: seedTag,
      owner_id: null,
      last_change_user_id: null,
      permission: 'protected',
      view_count: 0,
      updated_at: now,
    };

    if (existing) {
      database.notes.updateOne(
        filter,
        {
          $set: document,
          $setOnInsert: { created_at: now },
        },
      );
      updated += 1;
    } else {
      database.notes.insertOne({
        ...document,
        created_at: now,
      });
      inserted += 1;
    }
  }

  print(`[init] Inserted ${inserted} note(s), updated ${updated} note(s).`);
}

ensureIndexes();
resetExistingNotes();
seedNotes();
print(`[init] Seed set "${seedTag}" complete with ${notes.length} security and CTF note(s).`);
