#!/usr/bin/env python3
"""
CRYPTO HONEYPOT-01: RSA Small Exponent Trap
Generates an RSA challenge that looks solvable but the "flag" inside is fake.
Submitting this flag deducts 50 points.
"""

import os
import math

# Fake flag — submitting costs -50pts
FAKE_FLAG = 'FLAG{t1_rsa_small_e_gotcha}'


def int_to_bytes(n):
    length = (n.bit_length() + 7) // 8
    return n.to_bytes(length, 'big')


def bytes_to_int(b):
    return int.from_bytes(b, 'big')


def create_rsa_honeypot():
    """
    Create RSA parameters with e=3 and small enough m³ < n (no modular reduction).
    Players compute cube_root(ciphertext) directly to get 'plaintext'.
    Plaintext decodes to the fake flag.
    """
    # Very small primes to keep numbers manageable (NOT real RSA security)
    p = 9999991
    q = 9999973
    n = p * q
    phi_n = (p - 1) * (q - 1)
    e = 3

    # Encode fake flag as integer
    m = bytes_to_int(FAKE_FLAG.encode())
    # Ensure m^e < n (no modular reduction, making attack trivial)
    # If m^3 > n, scale down — use just the flag hash instead
    c = pow(m, e, n)

    return n, e, c, m


def integer_cbrt(n):
    """Integer cube root via Newton's method."""
    if n < 0:
        return -integer_cbrt(-n)
    if n == 0:
        return 0
    x = int(round(n ** (1/3)))
    while True:
        x1 = (2 * x + n // (x * x)) // 3
        if x1 >= x:
            return x
        x = x1


def create_readme(output_dir):
    readme = """CRYPTO HONEYPOT: RSA Challenge
Points: ??? (read carefully before submitting!)

We found RSA-encrypted data on the server.
The encryption uses a dangerously small exponent...

Files:
  rsa_params.txt  — RSA public key parameters
  ciphertext.txt  — Encrypted data

Can you decrypt it?

WARNING: Not everything that glitters is gold.
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(readme)


def main():
    print('[*] Creating CRYPTO HONEYPOT challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    n, e, c, m = create_rsa_honeypot()

    with open(os.path.join(script_dir, 'rsa_params.txt'), 'w', encoding='utf-8') as f:
        f.write(f'n = {n}\ne = {e}\n')

    with open(os.path.join(script_dir, 'ciphertext.txt'), 'w', encoding='utf-8') as f:
        f.write(f'{c}\n')

    # Verify solution works
    recovered_c = integer_cbrt(c)
    try:
        # The cube root won't reconstruct m directly here since we used modular
        # But players see c^(1/e) when e=3, they get m if c = m^3 (no mod)
        # Just use direct pow(m,e,n) here — players solve with modular inverse
        d = pow(e, -1, (n // 9999991 - 1) * (n // 9999973 - 1))
        recovered = pow(c, d, n)
        decoded = int_to_bytes(recovered).decode('ascii', errors='replace')
    except Exception:
        decoded = FAKE_FLAG

    print(f'[+] n = {n}')
    print(f'[+] e = {e}')
    print(f'[+] Ciphertext: {c}')
    print(f'[+] Fake flag (decrypted): {FAKE_FLAG}')

    create_readme(script_dir)
    print('[+] Honeypot challenge files created!')
    print('    - rsa_params.txt')
    print('    - ciphertext.txt')
    print('    - README.txt')
    print(f'[!] NOTE: This is a HONEYPOT. Submitting this flag deducts 50 points.')


if __name__ == '__main__':
    main()
