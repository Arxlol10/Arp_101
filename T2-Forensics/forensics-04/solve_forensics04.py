#!/usr/bin/env python3
"""
FORENSICS-04 Solver
Parses the binary journal file and extracts the flag from the 'secret-service' entry.
"""

import struct
import sys
import os


def solve(journal_path):
    with open(journal_path, 'rb') as f:
        data = f.read()

    # Parse header
    magic = data[:8]
    if magic != b'LPKSHHRH':
        print(f'[-] Invalid magic: {magic}')
        return None

    version = struct.unpack_from('<I', data, 8)[0]
    entry_count = struct.unpack_from('<I', data, 12)[0]
    print(f'[*] Journal v{version}, {entry_count} entries')

    offset = 32  # skip header (8+4+4+16)

    for i in range(entry_count):
        if offset + 4 > len(data):
            break

        entry_size = struct.unpack_from('<I', data, offset)[0]
        offset += 4

        entry_data = data[offset:offset + entry_size]
        offset += entry_size

        # Parse entry
        pos = 0
        marker = struct.unpack_from('<H', entry_data, pos)[0]
        pos += 2

        timestamp = struct.unpack_from('<Q', entry_data, pos)[0]
        pos += 8

        priority = struct.unpack_from('<B', entry_data, pos)[0]
        pos += 1

        tag_len = struct.unpack_from('<H', entry_data, pos)[0]
        pos += 2
        tag = entry_data[pos:pos + tag_len].decode('utf-8')
        pos += tag_len

        msg_len = struct.unpack_from('<H', entry_data, pos)[0]
        pos += 2
        message = entry_data[pos:pos + msg_len].decode('utf-8')

        if 'FLAG{' in message:
            print(f'[+] Found flag in entry tagged "{tag}": {message}')
            return message

    print('[-] Flag not found')
    return None


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    journal_path = os.path.join(script_dir, 'system.journal')
    if not os.path.exists(journal_path):
        print(f'[-] File not found: {journal_path}')
        print('[*] Run create_forensics04.py first.')
        sys.exit(1)
    solve(journal_path)


if __name__ == '__main__':
    main()
