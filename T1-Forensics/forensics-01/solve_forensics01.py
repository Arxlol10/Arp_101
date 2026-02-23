#!/usr/bin/env python3
"""
FORENSICS-01 Solution Script
Scans memory.dmp for the FLAG{...} pattern
"""

import re
import os
import sys


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dump_path = os.path.join(script_dir, 'memory.dmp')

    if not os.path.exists(dump_path):
        print(f'[-] File not found: {dump_path}')
        print('    Run create_forensics01.py first.')
        sys.exit(1)

    print('[*] Solving FORENSICS-01...')
    print(f'[+] Scanning: {dump_path}')

    with open(dump_path, 'rb') as f:
        data = f.read()

    print(f'[+] Dump size: {len(data)} bytes')

    # Search for FLAG pattern
    pattern = rb'FLAG\{[A-Za-z0-9_]+\}'
    matches = re.findall(pattern, data)

    if matches:
        for m in matches:
            print(f'\n[+] FLAG found: {m.decode()}')
        # Show offset too
        for m in matches:
            offset = data.find(m)
            print(f'[+] Located at offset: 0x{offset:x} ({offset})')
    else:
        print('[-] No flag pattern found.')


if __name__ == '__main__':
    main()
