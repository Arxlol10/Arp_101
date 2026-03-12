#!/usr/bin/env python3
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
_ENCODED = [69, 70, 80, 95, 100, 82, 31, 107, 73, 113, 63, 99, 37, 45, 86, 51, 5, 78, 237, 185, 235, 162, 233, 148, 217, 237, 200, 245, 189, 179]

_KEYLEN = 30

_CHECKSUM = "f6af6800739bbc6b40730f6c526b44ffeee790b10999fb2e88b440453cd48e25"


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
