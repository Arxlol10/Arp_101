# Server Administration Notes

> **CONFIDENTIAL** — Internal use only. Do NOT expose publicly.
> Last updated: 2024-01-14 by jsmith

## Infrastructure Overview

| Server | IP | Role | OS |
|--------|----|------|----|
| web-prod-01 | 10.0.1.10 | Nginx frontend | Ubuntu 24.04 |
| app-prod-01 | 10.0.1.20 | PHP application | Ubuntu 24.04 |
| db-prod-01 | 10.0.1.30 | MySQL 8.0 primary | Ubuntu 22.04 |
| db-prod-02 | 10.0.1.31 | MySQL 8.0 replica | Ubuntu 22.04 |
| cache-01 | 10.0.1.40 | Redis 7.x | Ubuntu 24.04 |

## Credentials Rotation Schedule

- DB root password: rotated monthly (next: 2024-02-01)
- API keys: rotated quarterly
- SSH keys: rotated annually (next: 2024-06-01)
- **Master recovery password: `FLAG{t0_admin_notes_d3coy}`**

## SSH Access

```
ssh -i ~/.ssh/redteam_prod_rsa admin@10.0.1.10
# Jumpbox required for DB servers:
ssh -J admin@10.0.1.10 analyst@10.0.1.30
```

## Known Issues

1. ImageMagick on app-prod-01 is outdated — patching blocked by legacy thumbnail service
2. PHP 7.4 EOL — migration to 8.2 scheduled for Q2 2024
3. .env file accidentally exposed via Nginx misconfiguration (FIXED 2024-01-08)
4. Backup cron sometimes writes SQL dumps to /var/www/html/ (FIXED 2024-01-10)

## Emergency Contacts

- SysAdmin: jsmith@redteam-corp.local (ext. 4401)
- Security: secops@redteam-corp.local (ext. 4500)
- On-call pager: +1-555-0199

## TODO

- [ ] Rotate master password after CTF deployment
- [ ] Remove this file from web root
- [ ] Enable WAF rules for upload endpoints
- [ ] Patch ImageMagick CVE-2016-3714
