#!/usr/bin/env python3
"""
CRYPTO-05 Challenge File Generator — Vigenère (full printable ASCII range)
Key: 'phantom'
Operates on printable ASCII 32-126 (not just A-Z) for robustness with CTF flags.
"""

import os

FLAG = 'FLAG{t1_vigenere_cracked_4you}'
KEY  = 'phantom'
CHARSET_START = 32
CHARSET_SIZE  = 95   # printable ASCII 32..126


def vigenere_encrypt(plaintext, key):
    """Full printable ASCII Vigenère (mod 95)."""
    result = []
    for i, char in enumerate(plaintext):
        if CHARSET_START <= ord(char) <= 126:
            shift = ord(key[i % len(key)]) - CHARSET_START
            enc = chr((ord(char) - CHARSET_START + shift) % CHARSET_SIZE + CHARSET_START)
            result.append(enc)
        else:
            result.append(char)
    return ''.join(result)


def create_readme(output_dir):
    readme = """CRYPTO-05: Vigenère Cipher
Points: 250
Difficulty: Medium

An intercepted message. The encryption is a polyalphabetic cipher
operating on the printable ASCII character set (32-126).

Files:
  vigenere.txt  — The encrypted message

Hints:
  - Key length is 7 characters
  - The cipher operates on all printable ASCII, not just A-Z (mod 95)
  - Known plaintext: flags always start with FLAG{
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating CRYPTO-05 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    ciphertext = vigenere_encrypt(FLAG, KEY)
    print(f'[+] Flag:       {FLAG}')
    print(f'[+] Key:        {KEY}')
    print(f'[+] Ciphertext: {ciphertext}')

    with open(os.path.join(script_dir, 'vigenere.txt'), 'w') as f:
        f.write('=== Intercepted Message ===\n')
        f.write(ciphertext + '\n')
        f.write('\n')
        f.write('(Polyalphabetic substitution cipher — printable ASCII)\n')

    create_readme(script_dir)
    print('[+] Challenge files created!')
    print('    - vigenere.txt')
    print('    - README.txt')


if __name__ == '__main__':
    main()
