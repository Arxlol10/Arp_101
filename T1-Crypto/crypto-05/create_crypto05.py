#!/usr/bin/env python3
"""
CRYPTO-05 Challenge File Generator
Encrypts flag with Vigenère cipher
Key: 'phantom'
Players use Index of Coincidence / Kasiski / Friedman test to break it
"""

import os

FLAG = 'FLAG{t1_vigenere_cracked_4you}'
KEY = 'phantom'


def vigenere_encrypt(plaintext, key):
    """Vigenère encryption — only encrypts A-Z (uppercased), passes others as-is."""
    result = []
    key_upper = key.upper()
    key_idx = 0
    for char in plaintext.upper():
        if char.isalpha():
            shift = ord(key_upper[key_idx % len(key_upper)]) - ord('A')
            encrypted = chr((ord(char) - ord('A') + shift) % 26 + ord('A'))
            result.append(encrypted)
            key_idx += 1
        else:
            result.append(char)
    return ''.join(result)


def create_readme(output_dir):
    readme = """CRYPTO-05: Vigenère Cipher
Points: 250
Difficulty: Medium

An intercepted message. The encryption is a classic polyalphabetic cipher.

Files:
  vigenere.txt  — The encrypted message

Hint: The key is 7 characters. Try the Friedman or Kasiski test to confirm key length,
      then frequency-analyse each column independently.
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
        f.write('(Encrypted with a polyalphabetic substitution cipher)\n')

    create_readme(script_dir)
    print('[+] Challenge files created!')
    print('    - vigenere.txt')
    print('    - README.txt')


if __name__ == '__main__':
    main()
