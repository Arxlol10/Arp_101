#!/usr/bin/env python3
"""
STEGO-02 Solution Script
Decodes DTMF tones from transmission.wav to recover the flag
"""

import struct
import math
import os
import sys


SAMPLE_RATE = 8000

DTMF_FREQS = {
    '1': (697, 1209), '2': (697, 1336), '3': (697, 1477),
    '4': (770, 1209), '5': (770, 1336), '6': (770, 1477),
    '7': (852, 1209), '8': (852, 1336), '9': (852, 1477),
    '0': (941, 1336), '*': (941, 1209), '#': (941, 1477),
    'A': (697, 1633), 'B': (770, 1633), 'C': (852, 1633), 'D': (941, 1633),
}

ROW_FREQS = [697, 770, 852, 941]
COL_FREQS = [1209, 1336, 1477, 1633]
DIGIT_MAP = [
    ['1', '2', '3', 'A'],
    ['4', '5', '6', 'B'],
    ['7', '8', '9', 'C'],
    ['*', '0', '#', 'D'],
]


def read_wav(filepath):
    """Read a mono 16-bit PCM WAV file, return samples list."""
    with open(filepath, 'rb') as f:
        # Skip RIFF header (44 bytes for standard PCM)
        f.read(4)   # 'RIFF'
        f.read(4)   # file size
        f.read(4)   # 'WAVE'
        # fmt chunk
        f.read(4)   # 'fmt '
        chunk_size = struct.unpack('<I', f.read(4))[0]
        audio_format = struct.unpack('<H', f.read(2))[0]
        num_channels = struct.unpack('<H', f.read(2))[0]
        sample_rate = struct.unpack('<I', f.read(4))[0]
        f.read(4)   # byte rate
        f.read(2)   # block align
        bits_per_sample = struct.unpack('<H', f.read(2))[0]
        # Skip any extra fmt bytes
        f.read(chunk_size - 16)
        # data chunk
        f.read(4)   # 'data'
        data_size = struct.unpack('<I', f.read(4))[0]
        raw = f.read(data_size)

    samples = [struct.unpack('<h', raw[i:i+2])[0] for i in range(0, len(raw), 2)]
    return samples, sample_rate


def goertzel(samples, target_freq, sample_rate):
    """Goertzel algorithm to detect energy at a specific frequency."""
    n = len(samples)
    k = int(0.5 + (n * target_freq) / sample_rate)
    omega = (2.0 * math.pi * k) / n
    coeff = 2.0 * math.cos(omega)
    s_prev = 0.0
    s_prev2 = 0.0
    for sample in samples:
        s = sample + coeff * s_prev - s_prev2
        s_prev2 = s_prev
        s_prev = s
    power = s_prev2 ** 2 + s_prev ** 2 - coeff * s_prev * s_prev2
    return power


def detect_dtmf_digit(samples, sample_rate):
    """Identify which DTMF digit is present in a chunk of samples."""
    threshold = 1e8

    row_powers = [goertzel(samples, f, sample_rate) for f in ROW_FREQS]
    col_powers = [goertzel(samples, f, sample_rate) for f in COL_FREQS]

    best_row = max(range(4), key=lambda i: row_powers[i])
    best_col = max(range(4), key=lambda i: col_powers[i])

    if row_powers[best_row] > threshold and col_powers[best_col] > threshold:
        return DIGIT_MAP[best_row][best_col]
    return None


def decode_dtmf_stream(samples, sample_rate):
    """Slide a window over the samples and detect DTMF digits."""
    window_size = int(sample_rate * 0.1)  # 100ms window
    step = int(sample_rate * 0.05)         # 50ms step

    digits = []
    last_digit = None
    consecutive = 0
    REQUIRED_CONSECUTIVE = 2

    for start in range(0, len(samples) - window_size, step):
        chunk = samples[start:start + window_size]
        digit = detect_dtmf_digit(chunk, sample_rate)
        if digit is not None:
            if digit == last_digit:
                consecutive += 1
            else:
                consecutive = 1
                last_digit = digit
            if consecutive == REQUIRED_CONSECUTIVE:
                digits.append(digit)
        else:
            last_digit = None
            consecutive = 0

    return digits


def digits_to_flag(digits):
    """Convert DTMF digit sequence back to flag string via ASCII decimal."""
    digit_str = ''.join(digits)
    flag = ''
    for i in range(0, len(digit_str) - 2, 3):
        group = digit_str[i:i+3]
        if group.isdigit():
            code = int(group)
            if 32 <= code <= 126:
                flag += chr(code)
    return flag


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    wav_path = os.path.join(script_dir, 'transmission.wav')

    if not os.path.exists(wav_path):
        print(f'[-] File not found: {wav_path}')
        print('    Run create_stego02.py first.')
        sys.exit(1)

    print('[*] Solving STEGO-02...')
    print(f'[+] Reading: {wav_path}')

    samples, sample_rate = read_wav(wav_path)
    print(f'[+] Samples: {len(samples)} @ {sample_rate}Hz ({len(samples)/sample_rate:.2f}s)')

    print('[+] Detecting DTMF tones...')
    digits = decode_dtmf_stream(samples, sample_rate)
    print(f'[+] Detected {len(digits)} digits: {"".join(digits)}')

    flag = digits_to_flag(digits)
    print(f'\n[+] FLAG: {flag}')


if __name__ == '__main__':
    main()
