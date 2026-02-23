#!/usr/bin/env python3
"""
FORENSICS-02 Challenge File Generator
Creates a raw disk image (disk.img) with a file containing the flag
that has been "deleted" (inode cleared) but data remains on disk.
Players use foremost/photorec/hex analysis to recover it.
"""

import os
import struct
import random

FLAG = b'FLAG{t1_deleted_but_not_gone_77j}'

# Simple FAT12-like structure (small, realistic, manually crafted)
# We'll create a 512KB raw disk image with realistic filesystem structures
# The flag will be in the "deleted" file's data sector

SECTOR_SIZE = 512
NUM_SECTORS = 1024  # 512KB image


def make_mbr():
    """Create a fake MBR sector."""
    mbr = bytearray(SECTOR_SIZE)
    # Classic MBR boot code start signature
    mbr[0] = 0xEB
    mbr[1] = 0x5A
    mbr[2] = 0x90
    # OEM name
    mbr[3:11] = b'MSDOS5.0'
    # BPB (BIOS Parameter Block) for FAT12
    struct.pack_into('<H', mbr, 11, SECTOR_SIZE)  # bytes per sector
    mbr[13] = 1   # sectors per cluster
    struct.pack_into('<H', mbr, 14, 1)  # reserved sectors
    mbr[16] = 2   # number of FATs
    struct.pack_into('<H', mbr, 17, 224)  # root dir entries
    struct.pack_into('<H', mbr, 19, NUM_SECTORS)  # total sectors
    mbr[21] = 0xF0  # media descriptor (removable)
    struct.pack_into('<H', mbr, 22, 9)   # sectors per FAT
    struct.pack_into('<H', mbr, 24, 18)  # sectors per track
    struct.pack_into('<H', mbr, 26, 2)   # number of heads
    # Boot signature
    mbr[510] = 0x55
    mbr[511] = 0xAA
    return bytes(mbr)


def make_fat_table():
    """Create a simple FAT12 table (2 copies, 9 sectors each)."""
    fat = bytearray(9 * SECTOR_SIZE)
    # FAT12 chain: 
    # Cluster 2,3 = deleted file (marked 0x000 = free)
    # Media descriptor + end markers
    fat[0] = 0xF0
    fat[1] = 0xFF
    fat[2] = 0xFF
    # clusters 2 and 3 are "free" (0x000) but were previously allocated
    # This simulates deleted file
    fat[3] = 0x00
    fat[4] = 0x00
    fat[5] = 0x00
    return bytes(fat)


def make_root_dir():
    """
    Create root directory with 224 entries.
    The deleted file entry has 0xE5 as first byte of filename.
    """
    root = bytearray(224 * 32)  # 224 entries × 32 bytes each

    # Entry 0: Volume label
    vol_label = bytearray(32)
    vol_label[0:11] = b'CTFDISK    '
    vol_label[11] = 0x08    # ATTR_VOLUME_ID
    root[0:32] = vol_label

    # Entry 1: A normal file (decoy)
    decoy = bytearray(32)
    decoy[0:8] = b'NOTES   '
    decoy[8:11] = b'TXT'
    decoy[11] = 0x20   # ATTR_ARCHIVE
    struct.pack_into('<H', decoy, 26, 4)  # start cluster
    struct.pack_into('<I', decoy, 28, 42) # file size
    root[32:64] = decoy

    # Entry 2: The deleted file — 0xE5 prefix, cluster 2, 33 bytes
    deleted = bytearray(32)
    deleted[0] = 0xE5   # deleted marker!
    deleted[1:8] = b'ECRET  '
    deleted[8:11] = b'TXT'
    deleted[11] = 0x20
    struct.pack_into('<H', deleted, 26, 2)   # start cluster: 2
    struct.pack_into('<I', deleted, 28, len(FLAG))
    root[64:96] = deleted

    return bytes(root)


def make_data_region(sectors):
    """
    Fill data region. Cluster 2 (sector offset from data start = 0)
    contains our flag. Rest is junk.
    """
    data = bytearray(sectors * SECTOR_SIZE)

    # Random decoy content in cluster 1 area (sector 0 of data)
    decoy_content = b'These are my investigation notes.\nNothing to see here.\n'
    data[0:len(decoy_content)] = decoy_content

    # Cluster 2 data (sector offset 1 in our data region) = FLAG
    # In FAT12: data starts at cluster 2, so cluster 2 = data sector 0... 
    # For simplicity, put flag at sector 1 of data region
    flag_offset = SECTOR_SIZE  # sector 1 of data region
    data[flag_offset:flag_offset + len(FLAG)] = FLAG
    data[flag_offset + len(FLAG):flag_offset + SECTOR_SIZE] = b'\x00' * (SECTOR_SIZE - len(FLAG))

    # Fill rest with semi-realistic junk
    for i in range(2 * SECTOR_SIZE, len(data), 512):
        data[i:i + 512] = bytes([random.randint(0, 255)] * 512)

    return bytes(data)


def create_disk_image(output_path):
    """Assemble the full disk image."""
    image = b''
    image += make_mbr()                          # sector 0: MBR
    image += make_fat_table()                    # sectors 1-9: FAT1
    image += make_fat_table()                    # sectors 10-18: FAT2
    image += make_root_dir()                     # sectors 19-32: root dir (~14 sectors for 224 entries)
    data_sectors = NUM_SECTORS - 33
    image += make_data_region(data_sectors)      # remaining: data

    # Pad/truncate to exact size
    target = NUM_SECTORS * SECTOR_SIZE
    image = image[:target].ljust(target, b'\x00')

    with open(output_path, 'wb') as f:
        f.write(image)
    print(f'[+] Disk image: {output_path} ({len(image)} bytes / {len(image)//1024}KB)')


def create_readme(output_dir):
    readme = """FORENSICS-02: Deleted File Recovery
Points: 250
Difficulty: Medium

We found this disk image on the suspect's USB drive.
A file was deleted, but can you recover what was erased?

Files:
  disk.img  — Raw FAT12 disk image (512KB)

Tools that may help:
  foremost, photorec, testdisk, xxd, strings
  Python: open('disk.img', 'rb') and scan for patterns
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating FORENSICS-02 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    create_disk_image(os.path.join(script_dir, 'disk.img'))
    create_readme(script_dir)
    print('[+] Challenge files created!')
    print('    - disk.img')
    print('    - README.txt')


if __name__ == '__main__':
    main()
