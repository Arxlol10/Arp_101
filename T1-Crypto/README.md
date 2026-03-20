# T1-Crypto — Cryptography Challenges

Tier 1 Cryptography challenges. Players operate as `www-data`.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| CRYPTO-04: XOR Cipher | Repeating-key XOR | 150 | Easy-Medium | REAL |
| CRYPTO-05: Vigenère | Polyalphabetic cipher | 150 | Medium | REAL |
| CRYPTO-HP01: RSA Trap | RSA small-e (honeypot) | -50 | Easy | HONEYPOT |

## File Structure

```
T1-Crypto/
├── crypto-04/
│   ├── create_crypto04.py   # Generator
│   ├── solve_crypto04.py    # Solution
│   ├── xor_cipher.bin       # Challenge file
│   ├── note.txt             # Key length hint
│   └── README.txt
│
├── crypto-05/
│   ├── create_crypto05.py   # Generator
│   ├── solve_crypto05.py    # Solution
│   ├── vigenere.txt         # Challenge file
│   └── README.txt
│
└── crypto-hp01/
    ├── create_crypto_hp01.py  # Generator
    ├── rsa_params.txt         # n, e
    ├── ciphertext.txt         # c
    └── README.txt
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| CRYPTO-04 | `FLAG{t1_xor_key_is_the_way_m2n}` | ✅ REAL |
| CRYPTO-05 | `FLAG{t1_vigenere_cracked_4you}` | ✅ REAL |
| CRYPTO-HP01 | `FLAG{t1_rsa_small_e_gotcha}` | ❌ HONEYPOT |
