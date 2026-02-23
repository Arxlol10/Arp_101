#!/usr/bin/env python3
"""
MISC-02 Solution Script
Reads the UserComment EXIF field from workstation_screenshot.jpg
"""

import os
import sys


def read_exif_user_comment(filepath):
    """Manually scan the JPEG for the UserComment EXIF tag."""
    with open(filepath, 'rb') as f:
        data = f.read()

    # Look for 'ASCII\x00\x00\x00' followed by the flag
    marker = b'ASCII\x00\x00\x00'
    idx = data.find(marker)
    if idx == -1:
        return None

    comment_start = idx + len(marker)
    # Read until null byte or non-printable
    comment_bytes = b''
    for byte in data[comment_start:comment_start + 256]:
        if byte == 0:
            break
        comment_bytes += bytes([byte])
    return comment_bytes.decode('ascii', errors='replace')


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    jpg_path = os.path.join(script_dir, 'workstation_screenshot.jpg')

    if not os.path.exists(jpg_path):
        print(f'[-] File not found: {jpg_path}')
        print('    Run create_misc02.py first.')
        sys.exit(1)

    print('[*] Solving MISC-02...')
    print(f'[+] Reading EXIF from: {jpg_path}')

    # Method 1: direct scan
    flag = read_exif_user_comment(jpg_path)
    if flag:
        print(f'[+] UserComment EXIF field: {flag}')
        print(f'\n[+] FLAG: {flag}')
    else:
        print('[-] UserComment not found via raw scan.')
        print('    Try: exiftool workstation_screenshot.jpg | grep UserComment')


if __name__ == '__main__':
    main()
