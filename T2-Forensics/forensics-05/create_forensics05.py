#!/usr/bin/env python3
"""
FORENSICS-05 Challenge File Generator
Creates a fake dmesg log with the flag hex-encoded as a kernel module parameter.
"""

import os
import random

FLAG = 'FLAG{t2_dm3sg_k3rn3l_fr4g_p8n}'

# Realistic dmesg lines
DMESG_LINES = [
    '[    0.000000] Linux version 6.5.0-14-generic (buildd@lcy02-amd64-051) (x86_64-linux-gnu-gcc-13 (Ubuntu 13.2.0-4ubuntu3) 13.2.0)',
    '[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-6.5.0-14-generic root=/dev/mapper/ubuntu--vg-ubuntu--lv ro quiet splash',
    '[    0.000000] BIOS-provided physical RAM map:',
    '[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable',
    '[    0.000000] BIOS-e820: [mem 0x0000000000100000-0x00000000bffeffff] usable',
    '[    0.000000] NX (Execute Disable) protection: active',
    '[    0.000004] SMBIOS 2.8 present.',
    '[    0.000004] DMI: QEMU Standard PC (i440FX + PIIX, 1996), BIOS 1.16.2-1.fc38 04/01/2014',
    '[    0.007591] tsc: Detected 2399.998 MHz processor',
    '[    0.012000] Calibrating delay loop (skipped), value calculated using timer frequency.. 4799.99 BogoMIPS (lpj=9599984)',
    '[    0.100000] Memory: 4028456K/4194304K available (16384K kernel code, 4096K rwdata, 12288K rodata)',
    '[    0.200000] ACPI: Early table checksum verification disabled',
    '[    0.200001] ACPI: RSDP 0x00000000000F58D0 000024 (v02 BOCHS )',
    '[    0.300000] Freeing SMP alternatives memory: 44K',
    '[    0.400000] smpboot: CPU0: AMD EPYC 7763 64-Core Processor (family: 0x19, model: 0x1, stepping: 0x1)',
    '[    0.500000] Performance Events: PMU not available, software events only.',
    '[    1.000000] PCI: Using configuration type 1 for base access',
    '[    1.100000] clocksource: tsc-early: mask: 0xffffffffffffffff max_cycles: 0x2298ca',
    '[    1.200000] e1000: Intel(R) PRO/1000 Network Driver',
    '[    1.200001] e1000 0000:00:03.0 eth0: (PCI:33MHz:32-bit) 52:54:00:12:34:56',
    '[    1.300000] EXT4-fs (sda1): mounted filesystem with ordered data mode. Opts: (null)',
    '[    1.400000] systemd[1]: systemd 253 (253-1ubuntu1) running in system mode',
    '[    2.000000] audit: type=1400 audit(1705320000.000:2): avc:  denied  { read } for  comm="chronyd"',
    '[    2.100000] systemd[1]: Listening on Journal Socket.',
    '[    2.200000] systemd[1]: Starting Load Kernel Module drm...',
    '[    2.300000] systemd[1]: Reached target Network (Pre).',
    '[    3.000000] NET: Registered PF_INET6 protocol family',
    '[    3.100000] Segment Routing with IPv6',
    '[    3.200000] In-situ OAM (IOAM) with IPv6',
    '[    4.000000] EXT4-fs (dm-0): recovery complete',
]


def create_dmesg_log(output_path):
    lines = list(DMESG_LINES)

    # Insert the flag as a hex-encoded kernel module parameter
    flag_hex = FLAG.encode().hex()
    flag_line = f'[    2.500000] ctf_module: loading out-of-tree module taints kernel. param=0x{flag_hex}'
    # Insert at a natural position among kernel messages
    insert_pos = random.Random(42).randint(20, len(lines) - 5)
    lines.insert(insert_pos, flag_line)

    # Add a few more lines after to pad
    lines.append('[    5.000000] systemd[1]: Started OpenBSD Secure Shell server.')
    lines.append('[    5.100000] systemd[1]: Reached target Multi-User System.')
    lines.append('[    5.200000] systemd[1]: Starting Nginx HTTP Server...')
    lines.append('[    5.300000] systemd[1]: Started Nginx HTTP Server.')
    lines.append('[    6.000000] systemd[1]: Startup finished in 1.200s (kernel) + 4.800s (userspace) = 6.000s.')

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'[+] dmesg log: {output_path} ({len(lines)} lines)')


def create_readme(output_dir):
    readme = """FORENSICS-05: Kernel dmesg Fragment
Points: 250
Difficulty: Medium

A fragment of the kernel ring buffer was captured during analysis.
Look for any suspicious kernel module loads — parameters may contain hidden data.

Files:
  dmesg.log  — Kernel ring buffer output

Tools that may help:
  grep, strings, xxd, python
  Hint: Look for hex-encoded parameters in module load messages.
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating FORENSICS-05 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    create_dmesg_log(os.path.join(script_dir, 'dmesg.log'))
    create_readme(script_dir)
    print('[+] Challenge files created!')
    print(f'    Flag: {FLAG}')


if __name__ == '__main__':
    main()
