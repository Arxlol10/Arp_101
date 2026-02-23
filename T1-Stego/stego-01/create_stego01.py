#!/usr/bin/env python3
"""
STEGO-01 Challenge File Generator
Embeds flag into LSB (Least Significant Bit) of a PNG image
Players must extract the LSB of each R channel byte in order
"""

import os
import struct
import zlib

# Flag to hide
FLAG = b'FLAG{t1_steg0_lsb_pixel_hunter_x7k}'

# Image dimensions — a realistic-looking "server screenshot"
WIDTH = 200
HEIGHT = 150


def create_png_with_lsb(flag_bytes, width, height, output_path):
    """
    Create a PNG where the flag is embedded in the LSB of the Red channel
    of each pixel, reading left-to-right, top-to-bottom.
    After flag bytes, remaining LSBs are set to 0.
    """

    # Build a simple gradient image (looks like a real screenshot)
    # Each pixel: RGBA
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            r = (x * 2) % 256
            g = (y * 2) % 256
            b = ((x + y) * 2) % 256
            row.append((r, g, b))
        pixels.append(row)

    # Embed flag bits into LSB of R channel
    flag_bits = []
    for byte in flag_bytes:
        for bit in range(7, -1, -1):
            flag_bits.append((byte >> bit) & 1)
    # Sentinel: 8 zero bits to mark end
    flag_bits.extend([0] * 8)

    bit_index = 0
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[y][x]
            if bit_index < len(flag_bits):
                r = (r & 0xFE) | flag_bits[bit_index]
                bit_index += 1
            pixels[y][x] = (r, g, b)

    # Write PNG manually
    def write_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = write_chunk(b'IHDR', ihdr_data)

    # IDAT chunk — raw pixel data (filter byte 0 per row)
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # filter type: None
        for r, g, b in row:
            raw_data += bytes([r, g, b])

    compressed = zlib.compress(raw_data, 9)
    idat = write_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = write_chunk(b'IEND', b'')

    with open(output_path, 'wb') as f:
        f.write(png_sig + ihdr + idat + iend)

    print(f'[+] PNG created: {output_path} ({width}x{height})')
    print(f'[+] Embedded {len(flag_bits)} bits ({len(flag_bytes)} bytes + sentinel)')


def create_readme(output_dir):
    readme = """STEGO-01: Hidden in Plain Pixels
Points: 350
Difficulty: Medium

We intercepted a screenshot from the analyst workstation.
Something feels off about this image...

Files:
  suspicious.png  — The intercepted image

Hint: Not everything you see is what you get.
      Look closer at the pixels.
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating STEGO-01 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    output_png = os.path.join(script_dir, 'suspicious.png')
    create_png_with_lsb(FLAG, WIDTH, HEIGHT, output_png)
    create_readme(script_dir)

    print('[+] Challenge files created!')
    print(f'[+] Files: {script_dir}/')
    print(f'    - suspicious.png  (challenge file)')
    print(f'    - README.txt')


if __name__ == '__main__':
    main()
