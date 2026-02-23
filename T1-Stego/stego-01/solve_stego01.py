#!/usr/bin/env python3
"""
STEGO-01 Solution Script
Extracts flag from LSB of the Red channel in suspicious.png
"""

import struct
import zlib
import sys
import os


def read_png_pixels(filepath):
    """Parse a PNG manually and return list of (r, g, b) tuples row by row."""
    with open(filepath, 'rb') as f:
        data = f.read()

    # Verify PNG signature
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'Not a valid PNG file'

    # Parse chunks
    pos = 8
    width = height = None
    idat_data = b''

    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8]
        chunk_data = data[pos+8:pos+8+length]
        pos += 12 + length  # length + type + data + CRC

        if chunk_type == b'IHDR':
            width, height = struct.unpack('>II', chunk_data[:8])
        elif chunk_type == b'IDAT':
            idat_data += chunk_data
        elif chunk_type == b'IEND':
            break

    # Decompress pixel data
    raw = zlib.decompress(idat_data)

    # Parse pixels (RGB, 8-bit, filter byte per row)
    pixels = []
    stride = 1 + width * 3  # filter byte + RGB per pixel
    for y in range(height):
        row_start = y * stride + 1  # skip filter byte
        row = []
        for x in range(width):
            px_start = row_start + x * 3
            r = raw[px_start]
            g = raw[px_start + 1]
            b = raw[px_start + 2]
            row.append((r, g, b))
        pixels.append(row)

    return pixels, width, height


def extract_lsb_flag(pixels, width, height):
    """Extract flag bits from LSB of Red channel."""
    bits = []
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[y][x]
            bits.append(r & 1)

    # Reconstruct bytes
    flag_bytes = []
    for i in range(0, len(bits), 8):
        byte_bits = bits[i:i+8]
        if len(byte_bits) < 8:
            break
        byte_val = 0
        for bit in byte_bits:
            byte_val = (byte_val << 1) | bit
        if byte_val == 0:  # sentinel — end of message
            break
        flag_bytes.append(byte_val)

    return bytes(flag_bytes)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    png_path = os.path.join(script_dir, 'suspicious.png')

    if not os.path.exists(png_path):
        print(f'[-] File not found: {png_path}')
        print('    Run create_stego01.py first.')
        sys.exit(1)

    print('[*] Solving STEGO-01...')
    print(f'[+] Reading: {png_path}')

    pixels, width, height = read_png_pixels(png_path)
    print(f'[+] Image dimensions: {width}x{height}')

    print('[+] Extracting LSB from Red channel...')
    flag = extract_lsb_flag(pixels, width, height)

    print(f'[+] Extracted bytes: {flag}')
    print(f'\n[+] FLAG: {flag.decode()}')


if __name__ == '__main__':
    main()
