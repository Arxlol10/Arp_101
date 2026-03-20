# T2-Crypto — Cryptography Challenges

Tier 2 Cryptography challenges. Players operate as `analyst`.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| CRYPTO-06: Encrypted Bash History | AES-128-CBC encrypted .bash_history | 250 | Medium | REAL |

## File Structure

```
T2-Crypto/
├── crypto-06/
│   ├── create_crypto06.py          # Generator
│   ├── solve_crypto06.py           # Solution
│   ├── encrypted_bash_history.enc  # Challenge file (IV + ciphertext)
│   ├── analyst_note.txt            # Hint note
│   └── README.txt
└── README.md
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| CRYPTO-06 | `FLAG{t2_bash_history_aes_d3crypt3d_k7x}` | ✅ REAL |
