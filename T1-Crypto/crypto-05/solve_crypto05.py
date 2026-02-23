#!/usr/bin/env python3
"""
CRYPTO-05 Solution Script
Breaks Vigenère cipher with known key length (7) and frequency analysis
"""

import os
import sys
from collections import Counter

# English letter frequency order
ENGLISH_FREQ_ORDER = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'


def vigenere_decrypt(ciphertext, key):
    result = []
    key_upper = key.upper()
    key_idx = 0
    for char in ciphertext:
        if char.isalpha():
            shift = ord(key_upper[key_idx % len(key_upper)]) - ord('A')
            decrypted = chr((ord(char) - ord('A') - shift) % 26 + ord('A'))
            result.append(decrypted)
            key_idx += 1
        else:
            result.append(char)
    return ''.join(result)


def crack_single_column(column_text):
    """Find the Caesar shift for a single column using frequency analysis."""
    # Try all 26 shifts, pick the one where most frequent letter maps to E/T
    best_shift = 0
    best_score = -1
    for shift in range(26):
        decrypted = ''.join(
            chr((ord(c) - ord('A') - shift) % 26 + ord('A')) if c.isalpha() else c
            for c in column_text
        )
        # Score: reward common English letters
        score = sum(ENGLISH_FREQ_ORDER.index(c) if c in ENGLISH_FREQ_ORDER else 25
                    for c in decrypted if c.isalpha())
        # Lower index = more common, so lower score = better
        if best_score == -1 or score < best_score:
            best_score = score
            best_shift = shift
    return best_shift


def crack_vigenere(ciphertext, key_length):
    """Split ciphertext into key_length columns, crack each independently."""
    alpha_only = [c for c in ciphertext if c.isalpha()]
    key = ''
    for i in range(key_length):
        column = ''.join(alpha_only[j] for j in range(i, len(alpha_only), key_length))
        shift = crack_single_column(column)
        key += chr(ord('A') + shift)
    return key


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cipher_path = os.path.join(script_dir, 'vigenere.txt')

    if not os.path.exists(cipher_path):
        print(f'[-] File not found: {cipher_path}')
        sys.exit(1)

    with open(cipher_path, 'r') as f:
        lines = f.readlines()

    # Extract just the ciphertext line
    ciphertext = ''
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('=') and not stripped.startswith('('):
            ciphertext = stripped
            break

    print('[*] Solving CRYPTO-05...')
    print(f'[+] Ciphertext: {ciphertext}')
    print('[+] Key length: 7 (from hint)')

    cracked_key = crack_vigenere(ciphertext, 7)
    print(f'[+] Cracked key: {cracked_key}')

    plaintext = vigenere_decrypt(ciphertext, cracked_key)
    print(f'\n[+] FLAG: {plaintext}')


if __name__ == '__main__':
    main()
