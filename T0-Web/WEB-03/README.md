# WEB-03: SSRF to Internal Service

| Field | Value |
|-------|-------|
| **Tier** | 0 — External / Pre-Auth |
| **Points** | 300 |
| **Category** | Web Exploitation |
| **Difficulty** | Medium |
| **Flag** | `FLAG{web_03_ssrf_internal_d8v5}` |

## Description

A URL preview tool ("LinkPeek") lets users enter a URL to fetch and display its contents. The tool uses `file_get_contents()` with inadequate URL filtering, allowing players to reach internal services. An internal admin API running on `localhost:8080` has an unprotected `/flag` endpoint.

## Vulnerability

- URL preview fetches arbitrary URLs via `file_get_contents()`
- Weak blacklist only blocks `127.0.0.1` and `localhost` literally
- Bypass via: `0.0.0.0`, `0x7f000001`, `[::1]`, `localtest.me`, decimal IP
- Internal API on port 8080 returns the flag

## Solution Path

1. Discover the URL preview tool
2. Try `http://127.0.0.1:8080` → blocked
3. Bypass filter with `http://0.0.0.0:8080/flag` or `http://[::1]:8080/flag`
4. Read flag from internal API response
