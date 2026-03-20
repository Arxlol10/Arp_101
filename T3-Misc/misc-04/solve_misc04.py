#!/usr/bin/env python3
import os
import re
import base64

def solve():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    log_file = os.path.join(script_dir, "server_app.log")
    
    if not os.path.exists(log_file):
        print(f"[-] {log_file} not found. Run create_misc04.py first.")
        return
        
    print("[*] Parsing misc-04 logs...")
    
    flag = ""
    with open(log_file, "r") as f:
        for line in f:
            if "[CRITICAL] Memory fault in segment" in line:
                # Extract the base64 part at the end
                match = re.search(r'Core dump seq: ([a-zA-Z0-9+/=]+)', line)
                if match:
                    b64_data = match.group(1)
                    decoded = base64.b64decode(b64_data).decode()
                    flag += decoded
                    
    if flag:
        print(f"[+] Reassembled Flag: {flag}")
    else:
        print("[-] Flag not found.")

if __name__ == "__main__":
    solve()
