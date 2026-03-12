#!/usr/bin/env python3
"""
REVERSE-01 Solver
Reverses the license key validation to extract the flag.
"""

# The encoded data from the validator
_ENCODED = [69, 70, 80, 95, 100, 82, 31, 107, 73, 113, 63, 99, 37, 45, 86, 51, 5, 78, 237, 185, 235, 162, 233, 148, 217, 237, 200, 245, 189, 179]


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
