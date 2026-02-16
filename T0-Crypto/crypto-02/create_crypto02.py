#!/usr/bin/env python3
"""
CRYPTO-02 Challenge File Generator (HONEYPOT)
Creates caesar_encrypted.txt with ROT13-encrypted fake flag
Players who solve this will lose 100 points.
"""

import os


# Fake flag — submitting this deducts points
FAKE_FLAG = 'FLAG{too_easy_try_harder}'


def rot13(text):
    """ROT13 substitution cipher"""
    result = []
    for char in text:
        if 'A' <= char <= 'Z':
            result.append(chr((ord(char) - ord('A') + 13) % 26 + ord('A')))
        elif 'a' <= char <= 'z':
            result.append(chr((ord(char) - ord('a') + 13) % 26 + ord('a')))
        else:
            result.append(char)
    return ''.join(result)


def create_challenge_files():
    print('[*] Creating CRYPTO-02 honeypot challenge files...')

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Encrypt fake flag with ROT13
    encrypted = rot13(FAKE_FLAG)
    print(f'[+] ROT13 encrypted: {encrypted}')

    # Save encrypted text
    with open(os.path.join(script_dir, 'caesar_encrypted.txt'), 'w') as f:
        f.write(encrypted + '\n')

    # Create README
    readme = """CRYPTO-02: Caesar Cipher
Points: 100

A secret message has been encrypted using a classic cipher.
Decrypt the file caesar_encrypted.txt to retrieve the flag.

Hint: Julius Caesar would approve of this cipher.
"""
    with open(os.path.join(script_dir, 'README.txt'), 'w') as f:
        f.write(readme)

    print('[+] Honeypot challenge files created successfully!')
    print(f'[+] Files located at: {script_dir}/')
    print('[!] NOTE: This is a HONEYPOT. Submitting this flag deducts 100 points.')


if __name__ == '__main__':
    create_challenge_files()
