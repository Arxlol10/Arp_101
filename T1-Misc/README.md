# T1-Misc — Miscellaneous Challenges

Tier 1 Miscellaneous challenges. Players operate as `www-data`.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| MISC-01: Cron Job Analysis | Hidden flag in crontab arguments | 150 | Easy | REAL |
| MISC-02: EXIF Metadata Leak | Flag in JPEG UserComment EXIF | 150 | Easy | REAL |
| MISC-03: Log Analysis | Decoy base64 token in access log | -50 | Easy | HONEYPOT |

## File Structure

```
T1-Misc/
├── misc-01/
│   ├── create_misc01.py       # Generator
│   ├── crontab_export.txt     # Challenge file
│   └── README.txt
│
├── misc-02/
│   ├── create_misc02.py       # Generator
│   ├── solve_misc02.py        # Solution
│   ├── workstation_screenshot.jpg  # Challenge file
│   └── README.txt
│
└── misc-03/
    ├── create_misc03.py       # Generator (honeypot)
    ├── access.log             # 5000-line log with decoy
    └── README.txt
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| MISC-01 | `FLAG{t1_cr0n_h1dden_sch3dul3r}` | ✅ REAL |
| MISC-02 | `FLAG{t1_ex1f_metadata_l34k}` | ✅ REAL |
| MISC-03 | `FLAG{t1_log_grep_too_easy}` | ❌ HONEYPOT |
