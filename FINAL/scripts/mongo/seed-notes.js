const database = db.getSiblingDB('mowndark');
const now = new Date();

const notes = [
  ['seed-web-idor', 'Broken Access Control and IDOR Notes', ['web', 'idor', 'access-control'], '# Broken Access Control and IDOR Notes\n\nChange object identifiers in URLs, JSON bodies, and hidden fields to find authorization gaps. In CTFs the flag is often in another user note or admin-only draft.'],
  ['seed-web-sqli', 'SQL Injection Playbook', ['web', 'sqli', 'database'], '# SQL Injection Playbook\n\nStart with quotes, boolean probes, UNION column counting, and time delays. Dump schema only after you confirm the injection primitive.'],
  ['seed-web-xss', 'XSS Hunting Notes', ['web', 'xss', 'javascript'], '# XSS Hunting Notes\n\nSearch boxes, comments, profile fields, and Markdown previews are common sinks. Confirm the context before choosing a payload.'],
  ['seed-web-ssrf', 'SSRF Metadata Recon', ['web', 'ssrf', 'cloud'], '# SSRF Metadata Recon\n\nTry loopback, internal hostnames, cloud metadata services, redirects, and scheme confusion. Watch for filtered but reachable internal routes.'],
  ['seed-misc-stego', 'Steganography Checklist', ['misc', 'stego', 'forensics'], '# Steganography Checklist\n\nRun strings, exiftool, binwalk, zsteg, and spectrogram analysis. Check trailing bytes, LSB planes, and hidden archive layers.'],
  ['seed-crypto-padding', 'CBC Padding Oracle Notes', ['crypto', 'padding-oracle'], '# CBC Padding Oracle Notes\n\nIf the server distinguishes padding errors from MAC or parse errors, decrypt one block at a time using controlled ciphertext changes.'],
  ['seed-forensics-pcap', 'PCAP Triage Workflow', ['forensics', 'pcap', 'network'], '# PCAP Triage Workflow\n\nUse protocol hierarchy, export HTTP objects, check DNS tunneling, inspect credentials, and recover transferred archives.'],
  ['seed-misc-pyjail', 'Python Jail Escape Ideas', ['misc', 'pyjail', 'python'], '# Python Jail Escape Ideas\n\nEnumerate globals, subclasses, traceback frames, encoding bypasses, and f-string evaluation. Avoid guessing before mapping the sandbox.'],
  ['seed-osint-usernames', 'OSINT Username Enumeration', ['osint', 'recon'], '# OSINT Username Enumeration\n\nCorrelate handles, profile images, commit metadata, archived pages, and certificate transparency records.'],
  ['seed-web-jwt', 'JWT Attack Notes', ['web', 'jwt', 'auth'], '# JWT Attack Notes\n\nDecode claims, test algorithm confusion, weak secrets, dangerous kid/jku headers, and server-side authorization checks.'],
  ['seed-cloud-k8s', 'Cloud Metadata and Kubernetes Notes', ['cloud', 'ssrf', 'kubernetes'], '# Cloud Metadata and Kubernetes Notes\n\nFrom SSRF, check metadata endpoints and service account tokens. In Kubernetes, inspect pod environment, mounted secrets, and API permissions.'],
  ['seed-rev-strings', 'Reverse Engineering First Pass', ['reverse', 'strings'], '# Reverse Engineering First Pass\n\nRun file, strings, ldd, checksec, and basic disassembly. Look for flag format references before deeper reversing.'],
];

for (const [shortid, title, tags, content] of notes) {
  database.notes.updateOne(
    { shortid },
    {
      $set: {
        shortid,
        alias: shortid,
        title,
        tags,
        content,
        owner_id: null,
        permission: 'protected',
        last_change_user_id: null,
        updated_at: now,
      },
      $setOnInsert: {
        view_count: 0,
        created_at: now,
      },
    },
    { upsert: true }
  );
}

print(`seeded=${notes.length} notes into mowndark.notes`);
