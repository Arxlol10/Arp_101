#!/bin/bash
# =============================================================================
# NETWORK-01 Solver: Port Knocking
# Knocks on ports 7000, 8000, 9000 then fetches the flag
# =============================================================================

TARGET="127.0.0.1" # Replace with CTF box IP

echo "[*] Solving NETWORK-01..."
echo "[+] Knocking on ports 7000, 8000, 9000..."

# Use knock if installed, otherwise netcat/nmap
if command -v knock &> /dev/null; then
    knock $TARGET 7000 8000 9000
else
    # Netcat fallback (timeout specified so it doesn't hang)
    nc -z -w 1 $TARGET 7000
    nc -z -w 1 $TARGET 8000
    nc -z -w 1 $TARGET 9000
fi

echo "[+] Knock sequence complete. Retrieving flag..."

# Fetch the unlocked flag
curl -s http://$TARGET/unlocked_flag.txt

echo ""
echo "[*] Done."
