#!/usr/bin/env python3
"""
FORENSICS-01 Challenge File Generator
Creates a fake memory dump (memory.dmp) with the flag hidden in a simulated heap region.
Players use strings, grep, or hex analysis to find it.
"""

import os
import struct
import random

FLAG = b'FLAG{t1_mem_dump_analyst_r4m}'

# Fake process names to make it look realistic
PROCESS_NAMES = [
    b'systemd', b'nginx', b'php-fpm7.4', b'mysql', b'sshd',
    b'cron', b'rsyslogd', b'agetty', b'dbus-daemon', b'NetworkManager',
]

HEAP_JUNK_STRINGS = [
    b'__malloc_hook', b'__free_hook', b'libc.so.6', b'libpthread.so.0',
    b'GLIBC_2.17', b'_ITM_deregisterTMCloneTable', b'/proc/self/maps',
    b'environ', b'LD_PRELOAD', b'/lib/x86_64-linux-gnu/libc-2.31.so',
]


def make_fake_pe_header():
    """Fake a Linux memory region header."""
    header = b'CORE'  # ELF core dump magic-ish
    header += b'\x7fELF\x02\x01\x01\x00'  # ELF magic
    header += b'\x00' * 8
    header += struct.pack('<H', 4)    # ET_CORE
    header += struct.pack('<H', 62)   # x86-64
    header += struct.pack('<I', 1)    # version
    return header


def make_fake_process_list():
    """Generate a fake /proc-style process table blob."""
    blob = b''
    for pid, name in enumerate(PROCESS_NAMES, start=1):
        entry = f'  {pid * 100:6d} '.encode()
        entry += name.ljust(16)
        entry += f' Ss   0:0{pid:02d} '.encode()
        entry += name + b'\n'
        blob += entry
    return blob


def make_heap_region(flag, size=8192):
    """Simulate a heap region with flag buried among junk."""
    region = bytearray(os.urandom(size))

    # Insert junk strings at random offsets
    for junk in HEAP_JUNK_STRINGS:
        offset = random.randint(0, size - len(junk) - 1)
        region[offset:offset + len(junk)] = junk

    # Bury the flag inside a fake struct — surrounded by realistic-looking data
    flag_padding_pre = b'\x00' * 8 + b'heap_alloc_flag\x00'
    flag_payload = flag_padding_pre + flag + b'\x00'
    flag_offset = random.randint(size // 3, size // 2)
    region[flag_offset:flag_offset + len(flag_payload)] = flag_payload[:size - flag_offset]

    return bytes(region)


def create_memory_dump(output_path):
    """Assemble the full fake memory dump."""
    dump = b''
    dump += make_fake_pe_header()
    dump += b'\n--- Memory Map ---\n'
    dump += b'7ffe0000-7ffff000 r-xp 00000000 00:00 0  [vdso]\n'
    dump += b'7f8c0000-7f8e0000 r--p 00000000 fd:00 12345  /lib/x86_64-linux-gnu/libc-2.31.so\n'
    dump += b'55a3c000-55a5d000 rw-p 00000000 fd:00 98765  [heap]\n'
    dump += b'\n--- Process List ---\n'
    dump += make_fake_process_list()
    dump += b'\n--- Heap Region (heap dump) ---\n'
    dump += make_heap_region(FLAG)
    dump += b'\n--- Stack Region ---\n'
    dump += os.urandom(2048)
    dump += b'\n--- End of Dump ---\n'
    dump += os.urandom(1024)

    with open(output_path, 'wb') as f:
        f.write(dump)
    print(f'[+] Memory dump: {output_path} ({len(dump)} bytes)')


def create_readme(output_dir):
    readme = """FORENSICS-01: Memory Dump Analysis
Points: 300
Difficulty: Medium

We captured a memory snapshot from a suspicious process on the analyst workstation.
Analyze memory.dmp to find what the process was hiding.

Files:
  memory.dmp  — Raw memory dump

Tools that may help:
  strings, grep, xxd, hexdump, volatility
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating FORENSICS-01 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    create_memory_dump(os.path.join(script_dir, 'memory.dmp'))
    create_readme(script_dir)
    print('[+] Challenge files created!')
    print('    - memory.dmp')
    print('    - README.txt')


if __name__ == '__main__':
    main()
