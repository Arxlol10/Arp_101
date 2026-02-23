#!/usr/bin/env python3
"""
CRYPTO-04 Solution Script
Breaks repeating-key XOR cipher
Approach: key length is given (7) — XOR each byte column with 0x00-0xFF
          using frequency analysis (or brute-force since plaintext starts with FLAG{)
"""

import os
import sys


def xor_decrypt(ciphertext, key):
    return bytes([ciphertext[i] ^ key[i % len(key)] for i in range(len(ciphertext))])


def brute_force_xor(ciphertext, key_length):
    """
    Known-plaintext attack: FLAG{ is always the prefix.
    This lets us recover the first 5 key bytes directly.
    Then brute-force remaining key bytes.
    """
    known_prefix = b'FLAG{'
    key = bytearray(key_length)

    # Recover first min(len(prefix), key_length) key bytes
    for i in range(min(len(known_prefix), key_length)):
        key[i] = ciphertext[i] ^ known_prefix[i]

    # For remaining bytes, do frequency analysis or brute force
    # (For 7-byte key: bytes 5, 6 unknown — brute force)
    for b5 in range(256):
        for b6 in range(256):
            key[5] = b5
            key[6] = b6
            candidate = xor_decrypt(ciphertext, bytes(key))
            # Check if result looks like a flag
            if candidate.startswith(b'FLAG{') and candidate.endswith(b'}'):
                try:
                    decoded = candidate.decode('ascii')
                    if all(32 <= ord(c) <= 126 for c in decoded):
                        return bytes(key), candidate
    return None, None


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cipher_path = os.path.join(script_dir, 'xor_cipher.bin')

    if not os.path.exists(cipher_path):
        print(f'[-] File not found: {cipher_path}')
        sys.exit(1)

    with open(cipher_path, 'rb') as f:
        ciphertext = f.read()

    print('[*] Solving CRYPTO-04...')
    print(f'[+] Ciphertext ({len(ciphertext)} bytes): {ciphertext.hex()}')
    print('[+] Known key length: 7 bytes (from note.txt)')
    print('[+] Running known-plaintext + brute-force attack...')

    key, flag = brute_force_xor(ciphertext, 7)

    if flag:
        print(f'[+] Key found: {key} ({key.decode("ascii", errors="replace")})')
        print(f'\n[+] FLAG: {flag.decode()}')
    else:
        print('[-] Attack failed.')


if __name__ == '__main__':
    main()
