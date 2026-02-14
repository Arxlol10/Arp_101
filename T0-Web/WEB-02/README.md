# WEB-02: LFI Chain to RCE

| Field | Value |
|-------|-------|
| **Tier** | 0 — External / Pre-Auth |
| **Points** | 300 |
| **Category** | Web Exploitation |
| **Difficulty** | Medium |
| **Flag** | `FLAG{web_02_lfi_chain_rce_m4p9}` |

## Description

A corporate intranet page viewer uses PHP `include()` to load pages dynamically. The `page` parameter is vulnerable to Local File Inclusion. Players must chain LFI with PHP filter wrappers to read source code, then poison access logs to achieve Remote Code Execution and read the flag.

## Vulnerability

- `include($_GET['page'] . '.php')` with no path sanitization
- PHP wrapper `php://filter` allows base64 reading of source files
- Nginx access log is readable by www-data at `/var/log/nginx/access.log`
- Log poisoning via User-Agent → RCE

## Solution Path

1. Discover LFI: `?page=../../../etc/passwd%00` or `?page=php://filter/convert.base64-encode/resource=config`
2. Read config.php via php://filter → find flag location at `/var/www/flag.txt`
3. Poison access log by sending a request with PHP code in User-Agent
4. Include the log: `?page=../../../var/log/nginx/access`
5. Execute command to read flag
