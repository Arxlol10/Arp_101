#!/usr/bin/env python3
"""
REVERSE-01 Challenge File Generator
Creates a "license key validator" that players must reverse engineer.
The validation logic uses XOR + shift + modular checks to verify a key.
"""

import os

FLAG = 'FLAG{t2_r3v3rs3_v4l1d4t0r_q5z}'

# The validation algorithm:
# 1. Key must be exactly 31 chars (length of FLAG)
# 2. Each char XOR'd with position index must equal corresponding encoded byte
# 3. The encoded bytes are generated from the flag at creation time

def generate_encoded_key(flag):
    """Encode flag using the reversible algorithm."""
    encoded = []
    for i, ch in enumerate(flag):
        val = ord(ch) ^ (i * 7 + 3)
        encoded.append(val & 0xFF)
    return encoded


def create_validator(output_path, encoded_key):
    """Generate the license_validator.py source."""
    source = '''#!/usr/bin/env python3
"""
██╗     ██╗ ██████╗███████╗███╗   ██╗███████╗███████╗
██║     ██║██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
██║     ██║██║     █████╗  ██╔██╗ ██║███████╗█████╗
██║     ██║██║     ██╔══╝  ██║╚═╝ ██║╚════██║██╔══╝
███████╗██║╚██████╗███████╗██║ ╚████║███████║███████╗
╚══════╝╚═╝ ╚═════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
        Enterprise License Validator v2.4.1
"""

import sys
import hashlib

# Encoded license data — do not modify
_ENCODED = ''' + repr(encoded_key) + '''

_KEYLEN = ''' + str(len(encoded_key)) + '''

_CHECKSUM = "''' + hashlib.sha256(FLAG.encode()).hexdigest() + '''"


def _transform(ch, pos):
    """Apply transformation to input character."""
    return ord(ch) ^ (pos * 7 + 3) & 0xFF


def validate_key(key):
    """Validate the provided license key."""
    if len(key) != _KEYLEN:
        return False

    for i, ch in enumerate(key):
        if _transform(ch, i) != _ENCODED[i]:
            return False

    # Final integrity check
    if hashlib.sha256(key.encode()).hexdigest() != _CHECKSUM:
        return False

    return True


def main():
    print(__doc__)
    print("Enter your license key to validate:")
    print()

    key = input("License Key> ").strip()

    if not key:
        print("[!] No key provided.")
        sys.exit(1)

    print()
    print("[*] Validating license key...")
    print(f"[*] Key length: {len(key)}")
    print(f"[*] Expected length: {_KEYLEN}")
    print()

    if validate_key(key):
        print("[+] ✓ LICENSE VALID!")
        print(f"[+] Congratulations! Your key is the flag.")
    else:
        print("[-] ✗ INVALID LICENSE KEY")
        print("[-] Please contact your administrator.")
        sys.exit(1)


if __name__ == "__main__":
    main()
'''
    with open(output_path, 'w') as f:
        f.write(source)
    print(f'[+] Validator: {output_path}')


def create_solver(output_path, encoded_key):
    """Generate the solve script."""
    source = '''#!/usr/bin/env python3
"""
REVERSE-01 Solver
Reverses the license key validation to extract the flag.
"""

# The encoded data from the validator
_ENCODED = ''' + repr(encoded_key) + '''


def reverse_key():
    """Reverse the XOR transformation to recover the flag."""
    flag = ""
    for i, val in enumerate(_ENCODED):
        # Reverse: ch = encoded[i] XOR (i * 7 + 3)
        ch = val ^ (i * 7 + 3) & 0xFF
        flag += chr(ch)
    return flag


def main():
    print("[*] Reversing license validator...")
    flag = reverse_key()
    print(f"[+] Flag: {flag}")


if __name__ == "__main__":
    main()
'''
    with open(output_path, 'w') as f:
        f.write(source)
    print(f'[+] Solver: {output_path}')


def create_readme(output_dir):
    readme = """REVERSE-01: License Key Validator
Points: 400
Difficulty: Hard

We found a license validation tool on the analyst workstation.
Reverse engineer the validation algorithm to discover the correct key.
The correct key IS the flag.

Files:
  license_validator.py  — The validator to reverse engineer

Approach:
  1. Read the source code carefully
  2. Understand the _transform() function
  3. Figure out how to reverse the transformation
  4. Apply it to the _ENCODED array to recover the key
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating REVERSE-01 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    encoded_key = generate_encoded_key(FLAG)
    print(f'[*] Encoded key: {encoded_key}')

    create_validator(os.path.join(script_dir, 'license_validator.py'), encoded_key)
    create_solver(os.path.join(script_dir, 'solve_reverse01.py'), encoded_key)
    create_readme(script_dir)

    print('[+] Challenge files created!')
    print(f'    Flag: {FLAG}')


if __name__ == '__main__':
    main()
