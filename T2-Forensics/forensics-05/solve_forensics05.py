#!/usr/bin/env python3
"""
FORENSICS-05 Solver
Finds the hex-encoded flag in the dmesg kernel module parameter.
"""

import re
import binascii
import sys
import os

FLAG_PREFIX = 'FLAG{'


def solve(dmesg_path):
    with open(dmesg_path, 'r') as f:
        lines = f.readlines()

    for line in lines:
        # Look for hex parameters in module load lines
        match = re.search(r'param=0x([0-9a-fA-F]+)', line)
        if match:
            hex_data = match.group(1)
            try:
                decoded = binascii.unhexlify(hex_data).decode('utf-8', errors='ignore')
                if FLAG_PREFIX in decoded:
                    print(f'[+] Found flag in dmesg module param: {decoded}')
                    return decoded
            except Exception:
                continue

    # Fallback: search all hex strings
    for line in lines:
        hex_matches = re.findall(r'0x([0-9a-fA-F]{20,})', line)
        for h in hex_matches:
            try:
                decoded = binascii.unhexlify(h).decode('utf-8', errors='ignore')
                if FLAG_PREFIX in decoded:
                    print(f'[+] Found flag (hex): {decoded}')
                    return decoded
            except Exception:
                continue

    print('[-] Flag not found')
    return None


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dmesg_path = os.path.join(script_dir, 'dmesg.log')
    if not os.path.exists(dmesg_path):
        print(f'[-] File not found: {dmesg_path}')
        print('[*] Run create_forensics05.py first.')
        sys.exit(1)
    solve(dmesg_path)


if __name__ == '__main__':
    main()
