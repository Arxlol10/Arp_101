# Tier 1 — www-data Shell

Unlocked after gaining `www-data` access via Tier 0.

**Access:** Shell as `www-data`
**Goal:** Escalate to `analyst` user to unlock Tier 2
**Challenges:** 16 total (8 real + 8 honeypot)

---

## Challenge Overview

| ID | Category | Challenge | Points | Type |
|----|----------|-----------|--------|------|
| STEGO-01 | Steganography | Hidden in Plain Pixels (LSB PNG) | 350 | ✅ REAL |
| STEGO-02 | Steganography | Signal Intercept (DTMF WAV) | 200 | ✅ REAL |
| FORENSICS-01 | Forensics | Memory Dump Analysis | 300 | ✅ REAL |
| FORENSICS-02 | Forensics | Deleted File Recovery (FAT12) | 250 | ✅ REAL |
| CRYPTO-04 | Cryptography | XOR Cipher (repeating key) | 200 | ✅ REAL |
| CRYPTO-05 | Cryptography | Vigenère Cipher | 250 | ✅ REAL |
| MISC-01 | Misc | Cron Job Analysis | 200 | ✅ REAL |
| MISC-02 | Misc | EXIF Metadata Leak | 200 | ✅ REAL |
| PRIVESC-01 | PrivEsc | SUID find → analyst shell | 300 | ✅ REAL |
| CRYPTO-HP01 | Cryptography | RSA Small-e Trap | -50 | ❌ HONEYPOT |
| MISC-03 | Misc | Log Analysis Trap | -50 | ❌ HONEYPOT |
| PRIVESC-02 | PrivEsc | Sudo check_system.sh Trap | -50 | ❌ HONEYPOT |
| HP-01 | Standalone | backup.zip (password: admin123) | -50 | ❌ HONEYPOT |
| HP-02 | Standalone | credentials.txt (API token) | -50 | ❌ HONEYPOT |
| HP-03 | Standalone | secret_key.pem (fake RSA key) | -50 | ❌ HONEYPOT |

**Total real points available:** 2,250
**Tier unlock bonus:** +200 pts

---

## File Locations (on server)

```
/var/www/html/files/
├── stego/
│   ├── suspicious.png          (STEGO-01)
│   └── transmission.wav        (STEGO-02)
├── forensics/
│   ├── memory.dmp              (FORENSICS-01)
│   └── disk.img                (FORENSICS-02)
├── crypto/
│   ├── xor_cipher.bin          (CRYPTO-04)
│   ├── note.txt
│   ├── vigenere.txt            (CRYPTO-05)
│   └── rsa_params.txt          (HONEYPOT: CRYPTO-HP01)
└── misc/
    ├── crontab_export.txt       (MISC-01)
    ├── workstation_screenshot.jpg (MISC-02)
    ├── access.log               (HONEYPOT: MISC-03)
    ├── backup.zip               (HONEYPOT: HP-01)
    ├── credentials.txt          (HONEYPOT: HP-02)
    └── secret_key.pem           (HONEYPOT: HP-03)
```

## Deployment

```bash
chmod +x setup_ctf.sh
sudo ./setup_ctf.sh
```
