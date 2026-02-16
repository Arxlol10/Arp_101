import requests
import time
import sys

PORTS = {
    'WEB-01': 8001,
    'WEB-02': 8002,
    'WEB-03': 8003
}

def verify_challenge(name, port, ip="localhost"):
    url = f"http://{ip}:{port}"
    print(f"[*] Verifying {name} on {url}...")
    try:
        r = requests.get(url + "/index.php", timeout=5)
        if r.status_code == 200:
            print(f"[+] {name} is UP. Title: {r.text.split('<title>')[1].split('</title>')[0] if '<title>' in r.text else 'Unknown'}")
        else:
            print(f"[-] {name} returned status code {r.status_code}")
            return False
    except Exception as e:
        print(f"[-] {name} failed to connect: {e}")
        return False
    
    # Specific checks
    if name == 'WEB-01':
        # Check if upload.php executable
        try:
             r = requests.get(url + "/upload.php") # Should redirect or show error
             if r.status_code in [200, 302]:
                 print(f"[+] {name} upload.php is accessible")
        except: pass

    if name == 'WEB-03':
        # Check for JS file
        try:
            r = requests.get(url + "/js/auth.min.js")
            if r.status_code == 200 and "_0x" in r.text:
                print(f"[+] {name} auth.min.js found and looks obfuscated")
            else:
                 print(f"[-] {name} auth.min.js check failed")
        except: pass
        
        # Check admin 403
        try:
            r = requests.get(url + "/admin/index.php")
            if r.status_code == 403:
                print(f"[+] {name} /admin correctly returns 403 Forbidden")
            else:
                print(f"[-] {name} /admin returned {r.status_code} (expected 403)")
        except: pass

    return True

if __name__ == "__main__":
    target_ip = "localhost"
    if len(sys.argv) > 1:
        target_ip = sys.argv[1]
        
    print(f"[*] Verifying challenges on {target_ip}...")
    time.sleep(2) # Give servers a moment
    success = True
    for name, port in PORTS.items():
        # Update verify_challenge to use target_ip
        # We need to change the function signature or just pass the full URL
        # For simplicity, let's just monkeypatch the URL inside the loop or pass ip to function
        # But wait, verify_challenge takes (name, port) and hardcodes localhost.
        # Let's redefine verify_challenge inside the script to optionally take an IP 
        # OR just change how it's called.
        pass

    # Actually, it's better to rewrite the function signature in a separate edit or just update the whole file logic.
    # Let's just update the whole file to be cleaner.
    
    for name, port in PORTS.items():
        if not verify_challenge(name, port, target_ip):
            success = False
            
    if success:
        print("\n[+] All challenges verified successfully.")
        sys.exit(0)
    else:
        print("\n[-] Some challenges failed verification.")
        sys.exit(1)
