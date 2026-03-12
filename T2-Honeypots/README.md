# T2-Honeypots — Decoy Challenges

7 honeypot challenges designed to mislead players.
Submitting a honeypot flag results in a **-50 point penalty**.

> [!IMPORTANT]
> Run `create_honeypots.py` on the CTF server to generate all decoy files.

## Honeypots

| # | File | Lure | Fake Flag |
|---|------|------|-----------|
| 1 | `engineer_password.txt` | Plaintext "engineer" creds | `FLAG{t2_eng_pass_tr4p}` |
| 2 | `.secret_key` | Hidden API key file | `FLAG{t2_s3cret_key_f4ke}` |
| 3 | `database_backup.sql` | SQL dump with flag in comment | `FLAG{t2_db_backup_n0pe}` |
| 4 | `id_rsa_engineer` | Fake SSH private key | `FLAG{t2_ssh_key_l0l}` |
| 5 | `config.enc` | "Encrypted" config (obvious base64) | `FLAG{t2_config_d3c0y}` |
| 6 | `.bash_history_leak` | Suspicious bash history | `FLAG{t2_h1story_tr4p}` |
| 7 | `escalation_notes.md` | Fake pentest notes | `FLAG{t2_n0tes_g0tcha}` |

## File Structure

```
T2-Honeypots/
├── create_honeypots.py    # Generator for all 7 decoys
├── README.md
└── README.txt             # (generated)
```

## Setup

```bash
python3 create_honeypots.py
# Then deploy generated files to visible locations on the CTF server
```
