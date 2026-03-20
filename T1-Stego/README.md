# T1-Stego — Steganography Challenges

Tier 1 Steganography challenges. Players operate as `www-data` and find these files on the server.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| STEGO-01: Hidden in Plain Pixels | LSB Image Steganography (PNG) | 150 | Medium | REAL |
| STEGO-02: Signal Intercept | DTMF Audio Encoding (WAV) | 150 | Easy-Medium | REAL |

## File Structure

```
T1-Stego/
├── stego-01/
│   ├── create_stego01.py     # Generator (admin only)
│   ├── solve_stego01.py      # Solution (admin only)
│   ├── suspicious.png        # Challenge file
│   └── README.txt            # Challenge description
│
└── stego-02/
    ├── create_stego02.py     # Generator (admin only)
    ├── solve_stego02.py      # Solution (admin only)
    ├── transmission.wav      # Challenge file
    ├── hint.txt              # DTMF frequency table + encoding hint
    └── README.txt            # Challenge description
```

## Flags

| Challenge | Flag |
|-----------|------|
| STEGO-01 | `FLAG{t1_steg0_lsb_pixel_hunter_x7k}` |
| STEGO-02 | `FLAG{t1_dtmf_audio_decode_p3q}` |

## Deployment

Run the generator scripts to produce the challenge files, then deploy to `/var/www/html/files/stego/`.
