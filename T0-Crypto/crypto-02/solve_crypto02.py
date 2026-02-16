#!/usr/bin/env python3
"""
CRYPTO-02 Solution Script (HONEYPOT)
Decrypts the ROT13 cipher — reveals a fake flag
"""

import os


def rot13(text):
    """ROT13 decryption (symmetric — same as encryption)"""
    result = []
    for char in text:
        if 'A' <= char <= 'Z':
            result.append(chr((ord(char) - ord('A') + 13) % 26 + ord('A')))
        elif 'a' <= char <= 'z':
            result.append(chr((ord(char) - ord('a') + 13) % 26 + ord('a')))
        else:
            result.append(char)
    return ''.join(result)


# Read encrypted file
script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, 'caesar_encrypted.txt'), 'r') as f:
    encrypted_text = f.read().strip()

print('[*] Decrypting CRYPTO-02...')
print('[+] Applying ROT13 decryption')
flag = rot13(encrypted_text)
print(f'[+] Flag: {flag}')
print('[!] WARNING: This is a HONEYPOT flag. Submitting it deducts 100 points!')
