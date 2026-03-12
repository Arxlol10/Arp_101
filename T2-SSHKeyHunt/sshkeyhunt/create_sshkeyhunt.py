#!/usr/bin/env python3
"""
T2-SSHKeyHunt Challenge Generator + Setup
Creates a multi-part SSH key assembly challenge.
The engineer's SSH private key is split into 4 parts, each hidden differently.
Players must find all parts and reassemble them to get the flag.

Parts:
  1. Hidden at offset in a GPG trustdb file
  2. Stored as a blob in a MySQL binary_storage table dump
  3. Embedded in every 7th line of a .bash_history file
  4. Stored in a git stash object
"""

import os
import base64
import hashlib
import random
import struct

FLAG = 'FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}'

# We simulate a 4-part key. Each part is a fragment that reassembles into the flag.
# Part markers help players know they have the right pieces.
PARTS = {
    1: f'PART1{{gpg_trust_offset}}:{base64.b64encode(b"FLAG{t2_ssh").decode()}',
    2: f'PART2{{mysql_blob_store}}:{base64.b64encode(b"_k3y_4ss3").decode()}',
    3: f'PART3{{bash_hist_7line}}:{base64.b64encode(b"mbl3d_e2r").decode()}',
    4: f'PART4{{git_stash_data}}:{base64.b64encode(b"}").decode()}',
}

# Decoded parts concatenated = FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}


def create_trustdb_file(output_dir):
    """Create a fake GPG trustdb.gpg with Part 1 hidden at a specific offset."""
    path = os.path.join(output_dir, 'trustdb.gpg')

    data = bytearray()
    # GPG trustdb header (version 3)
    data.extend(b'\x01')  # record type: version
    data.extend(b'gpg')   # magic
    data.extend(struct.pack('<B', 3))  # version
    data.extend(b'\x00' * 35)  # padding to 40 bytes

    # Add some fake trust records
    for i in range(10):
        record = bytearray(40)
        record[0] = 12  # record type: trust record
        # Fake fingerprint
        for j in range(1, 21):
            record[j] = random.Random(42 + i).randint(0, 255)
        record[21] = 6  # ownertrust: ultimate
        data.extend(record)

    # Insert Part 1 at offset 280
    part1_bytes = PARTS[1].encode('utf-8')
    target_offset = 280
    while len(data) < target_offset:
        data.extend(b'\x00')
    data[target_offset:target_offset + len(part1_bytes)] = part1_bytes

    # Pad to realistic size
    while len(data) < 1024:
        data.extend(bytes([random.Random(99).randint(0, 255)]))

    with open(path, 'wb') as f:
        f.write(data)
    print(f'[+] trustdb.gpg ({len(data)} bytes, Part 1 at offset {target_offset})')
    return path


def create_mysql_dump(output_dir):
    """Create a MySQL dump with Part 2 in a binary_storage table."""
    path = os.path.join(output_dir, 'binary_storage.sql')

    part2_hex = PARTS[2].encode().hex()
    content = f"""-- MySQL dump 10.13  Distrib 8.0.36
-- Table: binary_storage — internal key fragment storage

DROP TABLE IF EXISTS `binary_storage`;
CREATE TABLE `binary_storage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `label` varchar(64) NOT NULL,
  `data` blob,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `binary_storage` VALUES
  (1,'system_cert',X'2d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d','2024-01-10 08:00:00'),
  (2,'key_fragment',X'{part2_hex}','2024-01-10 09:15:00'),
  (3,'backup_hash',X'{hashlib.sha256(b"backup_2024").hexdigest().encode().hex()}','2024-01-10 10:30:00');

-- Dump completed
"""
    with open(path, 'w') as f:
        f.write(content)
    print(f'[+] binary_storage.sql (Part 2 in key_fragment row)')
    return path


def create_bash_history(output_dir):
    """Create a .bash_history with Part 3 on every 7th line."""
    path = os.path.join(output_dir, 'analyst_bash_history')

    commands = [
        'ls -la /home/analyst/',
        'cat /etc/passwd',
        'find / -name "*.conf" 2>/dev/null',
        'grep -r "password" /etc/ 2>/dev/null',
        'sudo -l',
        'netstat -tlnp',
        'whoami',
        'id',
        'uname -a',
        'ps aux | grep -i engineer',
        'cat /var/log/auth.log | tail -20',
        'mysql -u analyst -p',
        'ls /opt/',
        'cat /opt/tools/README.txt',
        'file /usr/local/bin/log_reader',
        'getcap -r / 2>/dev/null',
        'ss -tlnp',
        'curl http://localhost:8080',
        'docker ps 2>/dev/null',
        'crontab -l',
        'env',
        'mount',
        'lsblk',
        'df -h',
        'free -h',
        'top -bn1 | head -5',
        'dmesg | tail -20',
        'journalctl -n 50',
        'systemctl list-units --type=service',
        'last -10',
        'w',
        'who',
        'cat /proc/version',
        'cat /etc/os-release',
        'dpkg -l | grep -i ssh',
        'apt list --installed 2>/dev/null',
        'find /tmp -type f 2>/dev/null',
        'ls -la /dev/shm/',
        'cat /etc/crontab',
        'ls -la /etc/cron.d/',
        'find / -writable -type f 2>/dev/null',
        'history',
    ]

    # Encode Part 3 characters across every 7th line
    part3 = PARTS[3]
    lines = []
    part_idx = 0

    for i, cmd in enumerate(commands):
        if (i + 1) % 7 == 0 and part_idx < len(part3):
            # Embed part char as a comment in the command
            lines.append(f'echo "{part3[part_idx]}" >> /dev/null  # key fragment')
            part_idx += 1
        else:
            lines.append(cmd)

    # Add remaining part chars if any
    while part_idx < len(part3):
        padding_cmds = ['ls', 'pwd', 'date', 'uptime', 'hostname', 'clear']
        for pc in padding_cmds:
            lines.append(pc)
        lines.append(f'echo "{part3[part_idx]}" >> /dev/null  # key fragment')
        part_idx += 1

    with open(path, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'[+] analyst_bash_history ({len(lines)} lines, Part 3 on every 7th)')
    return path


def create_git_stash_data(output_dir):
    """Create a file simulating git stash data with Part 4."""
    path = os.path.join(output_dir, 'git_stash_fragment.txt')

    content = f"""# Git stash data recovered from /opt/old_projects/.git
# Extracted with: git stash show -p stash@{{0}}

diff --git a/config/keys.txt b/config/keys.txt
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/config/keys.txt
@@ -0,0 +1,3 @@
+# Key fragment — Part 4 of SSH assembly
+# Do not commit to main branch!
+{PARTS[4]}
"""
    with open(path, 'w') as f:
        f.write(content)
    print(f'[+] git_stash_fragment.txt (Part 4)')
    return path


def create_setup_script(output_dir):
    """Create server setup script that deploys all parts."""
    path = os.path.join(output_dir, 'setup_sshkeyhunt.sh')
    content = f"""#!/bin/bash
# =============================================================================
# T2-SSHKeyHunt Setup Script
# Run as root on the CTF server
# =============================================================================
# Challenge: Analyst must find 4 SSH key parts hidden across the system
# and reassemble them to obtain the flag.
# =============================================================================

set -e

FLAG='{FLAG}'

echo '[*] Setting up T2-SSHKeyHunt: SSH Key Assembly...'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Deploy Part 1: trustdb.gpg ───────────────────────────────────────────
mkdir -p /home/analyst/.gnupg
cp "$SCRIPT_DIR/trustdb.gpg" /home/analyst/.gnupg/trustdb.gpg
chown analyst:analyst /home/analyst/.gnupg/trustdb.gpg
chmod 600 /home/analyst/.gnupg/trustdb.gpg
echo '[+] Part 1 deployed: /home/analyst/.gnupg/trustdb.gpg (offset 280)'

# ── 2. Deploy Part 2: MySQL dump ────────────────────────────────────────────
mkdir -p /var/backups/mysql
cp "$SCRIPT_DIR/binary_storage.sql" /var/backups/mysql/binary_storage.sql
chown analyst:analyst /var/backups/mysql/binary_storage.sql
chmod 644 /var/backups/mysql/binary_storage.sql
echo '[+] Part 2 deployed: /var/backups/mysql/binary_storage.sql'

# ── 3. Deploy Part 3: bash history ──────────────────────────────────────────
cp "$SCRIPT_DIR/analyst_bash_history" /home/analyst/.bash_history
chown analyst:analyst /home/analyst/.bash_history
chmod 600 /home/analyst/.bash_history
echo '[+] Part 3 deployed: /home/analyst/.bash_history (every 7th line)'

# ── 4. Deploy Part 4: git stash ─────────────────────────────────────────────
mkdir -p /opt/old_projects/.git/refs/stash
cp "$SCRIPT_DIR/git_stash_fragment.txt" /opt/old_projects/.git/refs/stash/fragment.txt
chmod 644 /opt/old_projects/.git/refs/stash/fragment.txt
echo '[+] Part 4 deployed: /opt/old_projects/.git/refs/stash/fragment.txt'

# ── 5. Plant the flag ───────────────────────────────────────────────────────
FLAG_PATH='/home/analyst/.ssh_key_hunt_flag'
echo "$FLAG" > "$FLAG_PATH"
chown analyst:analyst "$FLAG_PATH"
chmod 400 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

echo ''
echo '[*] T2-SSHKeyHunt setup complete.'
echo ''
echo '--- Player solve path ---'
echo '1. Find Part 1: strings /home/analyst/.gnupg/trustdb.gpg | grep PART'
echo '   Or: xxd trustdb.gpg and look at offset 280'
echo '2. Find Part 2: grep key_fragment /var/backups/mysql/binary_storage.sql'
echo '   Then decode hex blob'
echo '3. Find Part 3: Extract every 7th line of ~/.bash_history'
echo '   Look for "key fragment" comments'
echo '4. Find Part 4: Explore /opt/old_projects/.git/'
echo '5. Decode each PART base64 value and concatenate'
echo "--- Flag: $FLAG ---"
"""
    with open(path, 'w') as f:
        f.write(content)
    print(f'[+] setup_sshkeyhunt.sh')
    return path


def create_solver(output_dir):
    """Create the solve script."""
    path = os.path.join(output_dir, 'solve_sshkeyhunt.py')
    content = f"""#!/usr/bin/env python3
\"\"\"
T2-SSHKeyHunt Solver
Demonstrates how to find and reassemble all 4 SSH key parts.
\"\"\"

import base64
import re

# The 4 parts (as found on the system)
PARTS_RAW = {{
    1: '{PARTS[1]}',
    2: '{PARTS[2]}',
    3: '{PARTS[3]}',
    4: '{PARTS[4]}',
}}


def extract_b64(part_str):
    \"\"\"Extract the base64 payload after the colon.\"\"\"
    _, b64_data = part_str.split(':', 1)
    return base64.b64decode(b64_data).decode()


def main():
    print('[*] Reassembling SSH key parts...')
    flag = ''
    for i in sorted(PARTS_RAW.keys()):
        decoded = extract_b64(PARTS_RAW[i])
        print(f'    Part {{i}}: {{decoded}}')
        flag += decoded

    print(f'[+] Assembled flag: {{flag}}')


if __name__ == '__main__':
    main()
"""
    with open(path, 'w') as f:
        f.write(content)
    print(f'[+] solve_sshkeyhunt.py')
    return path


def create_readme(output_dir):
    readme = """T2-SSHKeyHunt: SSH Key Assembly
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
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating T2-SSHKeyHunt challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    create_trustdb_file(script_dir)
    create_mysql_dump(script_dir)
    create_bash_history(script_dir)
    create_git_stash_data(script_dir)
    create_setup_script(script_dir)
    create_solver(script_dir)
    create_readme(script_dir)

    print('[+] All SSHKeyHunt files created!')
    print(f'    Flag: {{FLAG}}')
    print('    Parts:')
    for i, part in PARTS.items():
        decoded = base64.b64decode(part.split(':', 1)[1]).decode()
        print(f'      Part {{i}}: {{decoded}}')


if __name__ == '__main__':
    main()
