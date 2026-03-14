#!/usr/bin/env python3
"""
Solution for T3-NETWORK-01 (Port Knocking)

Run this via:
python3 solve_network01.py target_ip
"""
import socket
import sys
import time

def solve(target_ip):
    sequence = [1337, 7331, 8080, 2222]
    
    print(f"[*] Knocking on {target_ip}...")
    for port in sequence:
        try:
            # We just need to send a SYN packet. Socket connect sends a SYN.
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.1)
            s.connect((target_ip, port))
            s.close()
        except Exception:
            pass
        print(f"    -> Knocked port {port}")
        time.sleep(0.1)
        
    print("[+] Sequence complete.")
    print("[*] Now log into the engineer account and read ~/knock_flag.txt to get the flag:")
    print("    cat /home/engineer/knock_flag.txt")
    print("\n[+] Expected Flag: FLAG{t3_p0rt_kn0ck1ng_m4st3r_j8x}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 solve_network01.py <target_ip>")
        sys.exit(1)
    solve(sys.argv[1])
