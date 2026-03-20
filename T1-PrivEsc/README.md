# T1-PrivEsc — Privilege Escalation Challenges

Tier 1 PrivEsc challenges. Players operate as `www-data` and must escalate to `analyst`.

> [!IMPORTANT]
> These are **live server challenges** — require actual server configuration.
> Run the `setup_*.sh` scripts as root on the CTF box before the competition starts.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| PRIVESC-01: SUID find | GTFOBins SUID abuse | 200 | Medium | REAL |
| PRIVESC-02: Sudo trap | Sudo misconfiguration | -50 | Easy | HONEYPOT |

## File Structure

```
T1-PrivEsc/
├── privesc-01/
│   ├── setup_privesc01.sh    # Server config (run as root)
│   └── solve_privesc01.md    # Writeup / solution
│
└── privesc-02/
    └── setup_privesc02.sh    # Server config (run as root, honeypot)
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| PRIVESC-01 | `FLAG{t1_su1d_find_privesc_9z2}` | ✅ REAL |
| PRIVESC-02 | `FLAG{t1_sudo_trap_gotcha}` | ❌ HONEYPOT |

## Server Setup

```bash
# Run on the CTF server as root:
bash privesc-01/setup_privesc01.sh
bash privesc-02/setup_privesc02.sh
```
