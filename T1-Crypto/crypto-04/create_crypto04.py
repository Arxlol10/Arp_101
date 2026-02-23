#!/usr/bin/env python3
"""
CRYPTO-04 Challenge File Generator
Encrypts flag with repeating-key XOR cipher (full byte range)
Key: 'redteam' (7 bytes)
Players use key length hint + known-plaintext (FLAG{ prefix) to recover the key
"""

import os

FLAG = b'FLAG{t1_xor_key_is_the_way_m2n}'
KEY  = b'redteam'


def xor_encrypt(plaintext, key):
    return bytes([plaintext[i] ^ key[i % len(key)] for i in range(len(plaintext))])


def create_readme(output_dir):
    readme = """CRYPTO-04: XOR Cipher
Points: 200
Difficulty: Easy-Medium

We found an encrypted binary file. The encryption looked simple,
but we couldn't break it without the key.

Files:
  xor_cipher.bin  — XOR-encrypted data
  note.txt        — Analyst's note

Hint: The key is a common English word related to this operation.
      Tool: python3, or even xortool
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating CRYPTO-04 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    ciphertext = xor_encrypt(FLAG, KEY)

    output = os.path.join(script_dir, 'xor_cipher.bin')
    with open(output, 'wb') as f:
        f.write(ciphertext)
    print(f'[+] Flag:        {FLAG.decode()}')
    print(f'[+] Key:         {KEY.decode()} ({len(KEY)} bytes)')
    print(f'[+] Ciphertext:  {ciphertext.hex()}')

    note = (
        "I encrypted the access key using XOR before storing it.\n"
        "Key length hint: it's a 7-letter word.\n"
        "You'll figure it out.\n"
        "   - R.T.\n"
    )
    with open(os.path.join(script_dir, 'note.txt'), 'w') as f:
        f.write(note)

    create_readme(script_dir)
    print('[+] Challenge files created!')
    print('    - xor_cipher.bin')
    print('    - note.txt')
    print('    - README.txt')


if __name__ == '__main__':
    main()
