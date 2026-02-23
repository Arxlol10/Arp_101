#!/usr/bin/env python3
"""
CRYPTO-04 Solution Script — Repeating-key XOR
Extended known-plaintext attack:
  Flag format: FLAG{t1_..._m2n}
  Known chars: F,L,A,G,{,t,1   maps to key positions 0,1,2,3,4,5,6
  This gives us ALL 7 key bytes directly!
"""

import os
import sys


def xor_decrypt(ciphertext, key):
    return bytes([ciphertext[i] ^ key[i % len(key)] for i in range(len(ciphertext))])


def attack(ciphertext, key_length=7):
    # Extended known plaintext: 'FLAG{t1' covers all 7 key positions
    known_prefix = b'FLAG{t1'
    assert len(known_prefix) >= key_length, 'Need at least key_length known bytes'

    key = bytearray(key_length)
    for i in range(key_length):
        key[i] = ciphertext[i] ^ known_prefix[i]

    result = xor_decrypt(ciphertext, bytes(key))
    return bytes(key), result


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cipher_path = os.path.join(script_dir, 'xor_cipher.bin')

    if not os.path.exists(cipher_path):
        print(f'[-] File not found: {cipher_path}')
        print('    Run create_crypto04.py first.')
        sys.exit(1)

    with open(cipher_path, 'rb') as f:
        ciphertext = f.read()

    print('[*] Solving CRYPTO-04...')
    print(f'[+] Ciphertext ({len(ciphertext)} bytes): {ciphertext.hex()}')
    print('[+] Known plaintext prefix: "FLAG{t1" (7 chars = entire key length)')
    print('[+] Recovering all key bytes directly...')

    key, flag = attack(ciphertext, key_length=7)

    try:
        key_str = key.decode('ascii')
    except UnicodeDecodeError:
        key_str = key.hex()

    print(f'[+] Key recovered: {key_str}')
    print(f'\n[+] FLAG: {flag.decode()}')


if __name__ == '__main__':
    main()
