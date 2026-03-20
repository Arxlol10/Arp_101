#!/usr/bin/env python3
# =============================================================================
# misc-04 Generator: Huge obfuscated log file
# The flag is split across base64 encoded strings in anomalous log entries
# =============================================================================

import os
import random
import base64
from datetime import datetime, timedelta

FLAG = "FLAG{t3_10g_4n4ly515_4n0m4ly_x7k}"
# Let's split it into 4 parts
PART_SIZE = len(FLAG) // 4
PARTS = [FLAG[0:PART_SIZE], FLAG[PART_SIZE:PART_SIZE*2], FLAG[PART_SIZE*2:PART_SIZE*3], FLAG[PART_SIZE*3:]]

# We need a log file with ~10000 lines of noise.
# Standard log format:
# Jun 14 12:34:56 srv logd[123]: ...

def generate_logs():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    log_file = os.path.join(script_dir, "server_app.log")
    
    start_time = datetime(2024, 6, 14, 0, 0, 0)
    
    components = ['sshd', 'nginx', 'kernel', 'CRON', 'systemd', 'auditd', 'app_worker']
    messages = [
        "Connection closed by authenticating user root",
        "Invalid user admin from 10.0.1.55",
        "Failed password for root from 192.168.1.100 port 49123 ssh2",
        "Accepted publickey for sysadmin",
        "pam_unix(sshd:session): session opened for user root",
        "[error] 123#123: *456 directory index of '/var/www/html/' is forbidden",
        "GET /api/v1/status HTTP/1.1 200 45 'Mozilla/5.0'",
        "usb 1-1: new high-speed USB device number 4 using xhci_hcd",
        "Starting Cleanup of Temporary Directories...",
        "audit_printk_skb: 104 callbacks suppressed",
        "Worker 4 initialized successfully"
    ]
    
    with open(log_file, "w", encoding='utf-8') as f:
        # Generate 10000 lines, inserting the parts at random known indices
        target_indices = sorted(random.sample(range(1000, 9000), 4))
        
        part_idx = 0
        for i in range(10000):
            current_time = start_time + timedelta(seconds=i*random.randint(1,4))
            ts = current_time.strftime("%b %d %H:%M:%S")
            
            if part_idx < 4 and i == target_indices[part_idx]:
                # Insert anomalous entry: "app_worker: [CRITICAL] Memory fault in segment X " + base64(part)
                b64_part = base64.b64encode(PARTS[part_idx].encode()).decode()
                f.write(f"{ts} srv-prod-01 app_worker[{random.randint(1000,9999)}]: [CRITICAL] Memory fault in segment {part_idx}. Core dump seq: {b64_part}\n")
                part_idx += 1
            else:
                comp = random.choice(components)
                msg = random.choice(messages)
                f.write(f"{ts} srv-prod-01 {comp}[{random.randint(100, 9999)}]: {msg}\n")
                
    # Create README
    readme = """misc-04: Log Analysis
Points: 350
Difficulty: Medium

A massive log file from a production server was captured during an incident.
The attacker hid the flag within anomalous application worker crashes.
Search the log for critical faults and reassemble the core dump sequences.

Files:
  server_app.log
"""
    with open(os.path.join(script_dir, "README.txt"), "w", encoding='utf-8') as f:
        f.write(readme)
        
    print(f"[+] misc-04 Generator: Created server_app.log (10000 lines)")
    print(f"[+] Flag injected: {FLAG}")

if __name__ == "__main__":
    generate_logs()
