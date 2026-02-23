# T1-Honeypots — Standalone Decoy Challenges

Tier 1 standalone honeypot files. Placed in obvious locations to trap careless players.

## Honeypots

| File | Lure | Fake Flag | Penalty |
|------|------|-----------|---------|
| `backup.zip` | Password-protected zip (password: `admin123`) | `FLAG{t1_backup_found_nope}` | -50 pts |
| `credentials.txt` | Plaintext API token / credential dump | `FLAG{t1_creds_too_obvious}` | -50 pts |
| `secret_key.pem` | Fake RSA private key with flag in comments | `FLAG{t1_pem_not_real_key}` | -50 pts |

## Deployment

```bash
# Run generator to create all 3 files
python3 create_honeypots.py

# Deploy to web-accessible location
cp backup.zip credentials.txt secret_key.pem /var/www/html/files/misc/
```

> [!WARNING]
> Do NOT submit these flags. Each one costs -50 points.
