# T0-Crypto — Cryptography Challenges

Tier 0 Cryptography challenges for the Red Team CTF.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| CRYPTO-01: Multi-Layer | 3-Layer Decrypt (AES→Base85→ROT47) | 300 | Medium | REAL |
| CRYPTO-02: Caesar | ROT13 | -100 | Easy | HONEYPOT |
| CRYPTO-03: Hash Crack | MD5 → AES | -100 | Easy | HONEYPOT |

## File Structure

```
T0-Crypto/
├── setup_ctf.sh              # Deployment script
├── crypto-01/                 # REAL challenge (300pts)
│   ├── create_crypto01.py     # Generator script (admin only)
│   ├── solve_crypto01.py      # Solution script (admin only)
│   ├── encrypted_fragment.bin # Challenge file
│   ├── hint.txt               # Decryption order hint
│   └── README.txt             # Challenge description
│
├── crypto-02/                 # HONEYPOT (-100pts)
│   ├── create_crypto02.py     # Generator script (admin only)
│   ├── solve_crypto02.py      # Solution script (admin only)
│   ├── caesar_encrypted.txt   # ROT13 encrypted fake flag
│   └── README.txt             # Challenge description
│
└── crypto-03/                 # HONEYPOT (-100pts)
    ├── create_crypto03.py     # Generator script (admin only)
    ├── solve_crypto03.py      # Solution script (admin only)
    ├── hash.txt               # MD5 hash to crack
    ├── encrypted.bin          # AES encrypted fake flag
    └── README.txt             # Challenge description
```

## Deployment

```bash
chmod +x setup_ctf.sh
./setup_ctf.sh
```

This will:
1. Install Python dependencies (`pycryptodome`)
2. Generate all challenge files
3. Deploy challenge files to `/var/www/html/files/crypto/`
4. Only challenge files are deployed — generator and solution scripts stay in the repo

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| CRYPTO-01 | `FLAG{crypto_01_multi_layer_decrypt_n9k4}` | ✅ REAL |
| CRYPTO-02 | `FLAG{too_easy_try_harder}` | ❌ HONEYPOT |
| CRYPTO-03 | `FLAG{nice_try_keep_looking}` | ❌ HONEYPOT |
