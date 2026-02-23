#!/usr/bin/env python3
"""
FORENSICS-02 Solution Script
Scans disk.img raw bytes for the FLAG{...} pattern
Simulates what foremost/photorec does
"""

import re
import os
import sys


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    img_path = os.path.join(script_dir, 'disk.img')

    if not os.path.exists(img_path):
        print(f'[-] File not found: {img_path}')
        print('    Run create_forensics02.py first.')
        sys.exit(1)

    print('[*] Solving FORENSICS-02...')
    print(f'[+] Reading disk image: {img_path}')

    with open(img_path, 'rb') as f:
        data = f.read()

    print(f'[+] Image size: {len(data)} bytes ({len(data)//1024}KB)')

    # Method 1: grep for deleted entry (0xE5 first byte in root dir)
    print('\n[+] Method 1: Checking root directory for deleted entries...')
    # Root dir starts at sector 19 of a standard FAT12 (with 1 reserved + 9 FAT1 + 9 FAT2 sectors = 19)
    root_dir_offset = 19 * 512
    for i in range(0, 224 * 32, 32):
        entry = data[root_dir_offset + i: root_dir_offset + i + 32]
        if entry[0] == 0xE5:
            name = entry[1:8].decode('ascii', errors='replace').strip()
            ext = entry[8:11].decode('ascii', errors='replace').strip()
            import struct
            start_cluster = struct.unpack_from('<H', entry, 26)[0]
            file_size = struct.unpack_from('<I', entry, 28)[0]
            print(f'    [DEL] Filename: ?{name}.{ext}  Cluster: {start_cluster}  Size: {file_size}')

    # Method 2: Raw pattern scan
    print('\n[+] Method 2: Raw byte scan for FLAG{{...}} pattern...')
    pattern = rb'FLAG\{[A-Za-z0-9_]+\}'
    matches = re.findall(pattern, data)
    offsets = [m.start() for m in re.finditer(pattern, data)]

    if matches:
        for m, off in zip(matches, offsets):
            print(f'    [FOUND] 0x{off:06x} ({off}): {m.decode()}')
        print(f'\n[+] FLAG: {matches[0].decode()}')
    else:
        print('[-] No flag pattern found.')


if __name__ == '__main__':
    main()
