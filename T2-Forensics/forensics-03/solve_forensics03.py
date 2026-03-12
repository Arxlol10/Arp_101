#!/usr/bin/env python3
"""
FORENSICS-03 Solver
Extracts the flag from the MySQL dump by finding base64-encoded session data.
"""

import re
import base64
import binascii
import sys
import os

FLAG_PREFIX = 'FLAG{'


def solve(dump_path):
    with open(dump_path, 'r') as f:
        content = f.read()

    # Method 1: Look for hex-encoded BLOBs (X'...')
    hex_blobs = re.findall(r"X'([0-9a-fA-F]+)'", content)
    for hblob in hex_blobs:
        try:
            decoded_hex = binascii.unhexlify(hblob).decode('utf-8', errors='ignore')
            # Try base64 decode
            try:
                decoded_b64 = base64.b64decode(decoded_hex).decode('utf-8', errors='ignore')
                if FLAG_PREFIX in decoded_b64:
                    print(f'[+] Found flag in hex blob (base64 decoded): {decoded_b64}')
                    return decoded_b64
            except Exception:
                pass
            # Check raw
            if FLAG_PREFIX in decoded_hex:
                print(f'[+] Found flag in hex blob (raw): {decoded_hex}')
                return decoded_hex
        except Exception:
            continue

    # Method 2: Scan for base64 strings directly
    b64_candidates = re.findall(r'[A-Za-z0-9+/=]{20,}', content)
    for candidate in b64_candidates:
        try:
            decoded = base64.b64decode(candidate).decode('utf-8', errors='ignore')
            if FLAG_PREFIX in decoded:
                print(f'[+] Found flag (base64): {decoded}')
                return decoded
        except Exception:
            continue

    print('[-] Flag not found')
    return None


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dump_path = os.path.join(script_dir, 'analyst_db.sql')
    if not os.path.exists(dump_path):
        print(f'[-] File not found: {dump_path}')
        print('[*] Run create_forensics03.py first.')
        sys.exit(1)
    solve(dump_path)


if __name__ == '__main__':
    main()
