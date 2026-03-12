T2-SSHKeyHunt: SSH Key Assembly
Points: 400
Difficulty: Hard

The engineer's SSH private key has been split into 4 parts and hidden
across the system. Find all parts, decode them, and reassemble the key.

Parts are hidden in:
  1. A GPG trust database file (specific byte offset)
  2. A MySQL database dump (binary blob)
  3. A bash history file (every 7th line)
  4. A git stash in an old project directory

Each part is labeled PART1 through PART4 and contains base64-encoded data.
Decode and concatenate all 4 parts in order to reveal the flag.

Hints:
  - Use strings, xxd, grep to search for "PART" markers
  - Look at unusual files in ~/.gnupg/, /var/backups/, /opt/
  - Check .bash_history for patterns
