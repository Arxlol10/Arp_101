#!/usr/bin/env python3
"""
CRYPTO-05 Solution Script — Vigenère (printable ASCII mod 95)
Extended known-plaintext attack:
  Flag format: FLAG{t1_..._4you}
  Plain prefix 'FLAG{t1' (7 chars) covers all 7 key positions.
  key[i] = (cipher[i] - plain[i]) mod 95 for i in 0..6
"""

import os
import sys

CS = 32   # CHARSET_START
SZ = 95   # CHARSET_SIZE (printable ASCII 32..126)


def vigenere_decrypt(ciphertext, key):
    result = []
    for i, char in enumerate(ciphertext):
        shift = ord(key[i % len(key)]) - CS
        dec = chr((ord(char) - CS - shift) % SZ + CS)
        result.append(dec)
    return ''.join(result)


def attack(ciphertext, key_length=7):
    known_prefix = 'FLAG{t1'   # 7 chars covers all key positions
    key = ''.join(
        chr((ord(ciphertext[i]) - ord(known_prefix[i])) % SZ + CS)
        for i in range(key_length)
    )
    plaintext = vigenere_decrypt(ciphertext, key)
    return key, plaintext


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cipher_path = os.path.join(script_dir, 'vigenere.txt')

    if not os.path.exists(cipher_path):
        print(f'[-] File not found: {cipher_path}')
        print('    Run create_crypto05.py first.')
        sys.exit(1)

    with open(cipher_path, 'r') as f:
        lines = f.readlines()

    ciphertext = ''
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('=') and not stripped.startswith('('):
            ciphertext = stripped
            break

    print('[*] Solving CRYPTO-05...')
    print(f'[+] Ciphertext: {ciphertext}')
    print('[+] Known prefix: "FLAG{{t1" — recovers all 7 key bytes directly')

    key, flag = attack(ciphertext, key_length=7)
    print(f'[+] Cracked key: {key}')
    print(f'\n[+] FLAG: {flag}')


if __name__ == '__main__':
    main()
