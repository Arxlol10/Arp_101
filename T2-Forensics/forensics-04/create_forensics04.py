#!/usr/bin/env python3
"""
FORENSICS-04 Challenge File Generator
Creates a fake systemd journal binary file with structured log entries.
The flag is hidden in a log entry tagged 'secret-service'.
"""

import os
import struct
import hashlib
import random

FLAG = 'FLAG{t2_j0urn4l_b1n4ry_p4rs3_m2v}'

# Realistic syslog-style messages
LOG_ENTRIES = [
    ('systemd', 'Started Session 42 of user analyst.'),
    ('sshd', 'Accepted publickey for analyst from 10.0.0.5 port 49812 ssh2'),
    ('kernel', 'audit: type=1400 audit(1705320000.000:123): avc:  denied { read } comm="nginx"'),
    ('nginx', '10.0.0.1 - - [15/Jan/2024:08:00:01 +0000] "GET /dashboard HTTP/1.1" 200 4523'),
    ('cron', '(root) CMD (/usr/bin/certbot renew --quiet)'),
    ('mysql', '[Note] mysqld: ready for connections. Version: 8.0.36 socket: /var/run/mysqld/mysqld.sock'),
    ('sudo', 'analyst : TTY=pts/0 ; PWD=/home/analyst ; USER=root ; COMMAND=/usr/bin/apt update'),
    ('systemd', 'Starting Daily apt download activities...'),
    ('kernel', 'TCP: eth0: driver bug, speed 0 (count=3)'),
    ('nginx', '10.0.0.3 - - [15/Jan/2024:09:15:22 +0000] "POST /api/submit HTTP/1.1" 403 89'),
    ('secret-service', f'session-key: {FLAG}'),
    ('sshd', 'Connection closed by 10.0.0.5 port 49812 [preauth]'),
    ('systemd', 'Stopped target Timers.'),
    ('kernel', 'ACPI: \_SB_.PCI0.SATA: INTA -> GSI 22 (level, low)'),
    ('cron', '(analyst) CMD (/home/analyst/scripts/backup.sh)'),
    ('mysql', '[Warning] CA certificate ca.pem is self signed.'),
    ('NetworkManager', '<info>  [1705320900] dhcp4 (eth0): address 10.0.0.42'),
    ('systemd-logind', 'Session 42 logged out. Waiting for processes to exit.'),
    ('kernel', 'eth0: link up, 1000 Mbps, full duplex'),
    ('rsyslogd', 'imuxsock: Begin running UxSock'),
]


def create_journal_file(output_path):
    """
    Create a binary file that mimics a journal format.
    Not an actual systemd journal — it's a simplified binary format
    with length-prefixed tagged entries that players parse.
    """
    data = bytearray()

    # File header
    header_magic = b'LPKSHHRH'  # systemd journal magic
    data.extend(header_magic)
    data.extend(struct.pack('<I', 2))  # version
    data.extend(struct.pack('<I', len(LOG_ENTRIES)))  # entry count
    data.extend(b'\x00' * 16)  # reserved

    # Shuffle entries so flag isn't obviously placed
    entries = list(LOG_ENTRIES)
    random.seed(42)  # deterministic for reproducibility
    random.shuffle(entries)

    for tag, message in entries:
        entry = bytearray()

        # Entry marker
        entry.extend(b'\xfe\xfe')

        # Timestamp (fake, 8 bytes)
        ts = random.randint(1705300000, 1705400000)
        entry.extend(struct.pack('<Q', ts * 1000000))  # microseconds

        # Priority (3 = error for secret, 6 = info for others)
        priority = 3 if tag == 'secret-service' else 6
        entry.extend(struct.pack('<B', priority))

        # Tag (length-prefixed)
        tag_bytes = tag.encode('utf-8')
        entry.extend(struct.pack('<H', len(tag_bytes)))
        entry.extend(tag_bytes)

        # Message (length-prefixed)
        msg_bytes = message.encode('utf-8')
        entry.extend(struct.pack('<H', len(msg_bytes)))
        entry.extend(msg_bytes)

        # Padding to 8-byte alignment
        pad = (8 - len(entry) % 8) % 8
        entry.extend(b'\x00' * pad)

        # Entry size prefix
        data.extend(struct.pack('<I', len(entry)))
        data.extend(entry)

    # File footer
    data.extend(b'\xff' * 32)

    with open(output_path, 'wb') as f:
        f.write(data)
    print(f'[+] Journal file: {output_path} ({len(data)} bytes)')


def create_readme(output_dir):
    readme = """FORENSICS-04: Systemd Journal Binary
Points: 300
Difficulty: Medium-Hard

We recovered a binary journal export from the analyst's workstation.
Parse the structured log entries to find any secrets that were logged.

Files:
  system.journal  — Binary journal export (simplified format)

Format:
  Header: 8-byte magic "LPKSHHRH" + 4-byte version + 4-byte entry count + 16-byte reserved
  Each entry: 4-byte size prefix, then:
    2-byte marker (0xFEFE)
    8-byte timestamp (microseconds, little-endian)
    1-byte priority
    2-byte tag length + tag string
    2-byte message length + message string
    padding to 8-byte alignment

Tools that may help:
  python struct module, xxd, hexdump, strings
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating FORENSICS-04 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    create_journal_file(os.path.join(script_dir, 'system.journal'))
    create_readme(script_dir)
    print('[+] Challenge files created!')
    print(f'    Flag: {FLAG}')


if __name__ == '__main__':
    main()
