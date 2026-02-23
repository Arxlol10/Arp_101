#!/usr/bin/env python3
"""
STEGO-02 Challenge File Generator
Encodes flag as DTMF tones in a WAV file
Each character maps to a DTMF digit sequence
Players use Audacity or a DTMF decoder tool
"""

import os
import struct
import math

# Flag encoded as digits via custom mapping
FLAG = 'FLAG{t1_dtmf_audio_decode_p3q}'

# DTMF frequencies (row_freq, col_freq) for digits 0-9, *, #
DTMF_FREQS = {
    '1': (697, 1209), '2': (697, 1336), '3': (697, 1477),
    '4': (770, 1209), '5': (770, 1336), '6': (770, 1477),
    '7': (852, 1209), '8': (852, 1336), '9': (852, 1477),
    '0': (941, 1336), '*': (941, 1209), '#': (941, 1477),
    'A': (697, 1633), 'B': (770, 1633), 'C': (852, 1633), 'D': (941, 1633),
}

# Custom char→DTMF mapping for non-digit chars
# We map each character's ASCII value to a sequence of DTMF digits
def char_to_dtmf_sequence(char):
    """Convert a character to a DTMF digit sequence (3 digits: ASCII decimal)."""
    return f'{ord(char):03d}'


SAMPLE_RATE = 8000   # 8kHz (telephone quality)
TONE_DURATION = 0.15  # seconds per tone
SILENCE_DURATION = 0.05  # gap between tones


def generate_dtmf_tone(freq1, freq2, duration, sample_rate):
    """Generate a DTMF tone as a list of 16-bit PCM samples."""
    num_samples = int(sample_rate * duration)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        val = 0.5 * math.sin(2 * math.pi * freq1 * t) + \
              0.5 * math.sin(2 * math.pi * freq2 * t)
        # Normalize to 16-bit signed
        sample = int(val * 16383)
        sample = max(-32768, min(32767, sample))
        samples.append(sample)
    return samples


def generate_silence(duration, sample_rate):
    """Generate silence samples."""
    num_samples = int(sample_rate * duration)
    return [0] * num_samples


def write_wav(filename, samples, sample_rate):
    """Write PCM samples to a WAV file."""
    num_samples = len(samples)
    data_size = num_samples * 2  # 16-bit = 2 bytes per sample

    with open(filename, 'wb') as f:
        # RIFF header
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + data_size))
        f.write(b'WAVE')
        # fmt chunk
        f.write(b'fmt ')
        f.write(struct.pack('<I', 16))       # chunk size
        f.write(struct.pack('<H', 1))        # PCM format
        f.write(struct.pack('<H', 1))        # mono
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', sample_rate * 2))  # byte rate
        f.write(struct.pack('<H', 2))        # block align
        f.write(struct.pack('<H', 16))       # bits per sample
        # data chunk
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        for s in samples:
            f.write(struct.pack('<h', s))


def encode_flag_as_dtmf(flag):
    """Convert each character to DTMF digit sequence and generate tones."""
    all_samples = []
    dtmf_string = ''

    for char in flag:
        seq = char_to_dtmf_sequence(char)
        dtmf_string += seq

    print(f'[+] DTMF digit sequence ({len(dtmf_string)} digits): {dtmf_string}')

    for digit in dtmf_string:
        if digit in DTMF_FREQS:
            f1, f2 = DTMF_FREQS[digit]
            tone = generate_dtmf_tone(f1, f2, TONE_DURATION, SAMPLE_RATE)
            all_samples.extend(tone)
            all_samples.extend(generate_silence(SILENCE_DURATION, SAMPLE_RATE))

    return all_samples, dtmf_string


def create_readme(output_dir):
    readme = """STEGO-02: Signal Intercept
Points: 200
Difficulty: Easy-Medium

We intercepted a radio transmission from an unknown source.
The signal has been saved as transmission.wav

Decode the tones to find the flag.

Tools that may help:
  - Audacity (spectrogram view)
  - DTMF decoder apps
  - Python with scipy/numpy for tone analysis
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating STEGO-02 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Also write the DTMF mapping hint (partial — gives digit mapping, not ASCII trick)
    hint = """DTMF Tone Frequencies:
1: 697Hz + 1209Hz    2: 697Hz + 1336Hz    3: 697Hz + 1477Hz
4: 770Hz + 1209Hz    5: 770Hz + 1336Hz    6: 770Hz + 1477Hz
7: 852Hz + 1209Hz    8: 852Hz + 1336Hz    9: 852Hz + 1477Hz
0: 941Hz + 1336Hz

The message is encoded as ASCII decimal values.
Each character = 3 digits (e.g. 'A' = 065)
"""
    with open(os.path.join(script_dir, 'hint.txt'), 'w') as f:
        f.write(hint)

    print(f'[+] Encoding flag: {FLAG}')
    samples, dtmf_seq = encode_flag_as_dtmf(FLAG)

    wav_path = os.path.join(script_dir, 'transmission.wav')
    write_wav(wav_path, samples, SAMPLE_RATE)

    print(f'[+] WAV file: {wav_path}')
    print(f'[+] Duration: {len(samples)/SAMPLE_RATE:.2f} seconds')

    create_readme(script_dir)
    print('[+] Challenge files created!')
    print(f'    - transmission.wav  (challenge file)')
    print(f'    - hint.txt')
    print(f'    - README.txt')


if __name__ == '__main__':
    main()
