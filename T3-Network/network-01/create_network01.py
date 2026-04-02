#!/usr/bin/env python3
"""
Generator for T3-NETWORK-01 (Port Knocking)
Generates a PCAP file showing an admin doing a port knock sequence, followed by an SSH connection.
"""
import os
import sys

try:
    from scapy.all import IP, TCP, wrpcap, Ether
except ImportError:
    print("[-] Please install scapy: pip install scapy")
    sys.exit(1)

def create_pcap(filename):
    print("[*] Creating T3-NETWORK-01 challenge files...")
    
    # Sequence: 1337, 7331, 8080, 2222
    client_ip = "192.168.1.100"
    server_ip = "192.168.1.50"
    
    packets = []
    
    # 1. Noise
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54321, dport=80, flags="S"))
    packets.append(Ether()/IP(src=server_ip, dst=client_ip)/TCP(sport=80, dport=54321, flags="SA"))
    
    # 2. Port Knock Sequence
    # Knock 1: 1337
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54322, dport=1337, flags="S"))
    
    # Knock 2: 7331
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54323, dport=7331, flags="S"))
    
    # Knock 3: 8080
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54324, dport=8080, flags="S"))
    
    # Knock 4: 2222
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54325, dport=2222, flags="S"))
    
    # 3. Connection to an unknown admin service (successful because knock opened it)
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54326, dport=31337, flags="S"))
    packets.append(Ether()/IP(src=server_ip, dst=client_ip)/TCP(sport=31337, dport=54326, flags="SA"))
    # Some encrypted SSH-like traffic
    packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(sport=54326, dport=31337, flags="PA")/b"SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.1\r\n")

    wrpcap(filename, packets)
    print(f"[+] PCAP file generated: {filename}")
    print("    Flag: FLAG{t3_p0rt_kn0ck1ng_s3qu3nc3_v2b}")
    print("    Sequence: 1337, 7331, 8080, 2222")
    
if __name__ == "__main__":
    create_pcap("suspicious_traffic.pcap")
