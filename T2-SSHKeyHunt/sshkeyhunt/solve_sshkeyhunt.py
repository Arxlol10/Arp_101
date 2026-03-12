#!/usr/bin/env python3
"""
T2-SSHKeyHunt Solver
Demonstrates how to find and reassemble all 4 SSH key parts.
"""

import base64
import re

# The 4 parts (as found on the system)
PARTS_RAW = {
    1: 'PART1{gpg_trust_offset}:RkxBR3t0Ml9zc2g=',
    2: 'PART2{mysql_blob_store}:X2szeV80c3Mz',
    3: 'PART3{bash_hist_7line}:bWJsM2RfZTJy',
    4: 'PART4{git_stash_data}:fQ==',
}


def extract_b64(part_str):
    """Extract the base64 payload after the colon."""
    _, b64_data = part_str.split(':', 1)
    return base64.b64decode(b64_data).decode()


def main():
    print('[*] Reassembling SSH key parts...')
    flag = ''
    for i in sorted(PARTS_RAW.keys()):
        decoded = extract_b64(PARTS_RAW[i])
        print(f'    Part {i}: {decoded}')
        flag += decoded

    print(f'[+] Assembled flag: {flag}')


if __name__ == '__main__':
    main()
