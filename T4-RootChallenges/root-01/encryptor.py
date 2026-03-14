import sys
def encrypt(p, k):
    pad = 16 - (len(p) % 16)
    p = p.encode() + bytes([pad] * pad)
    c = bytearray()
    for i in range(0, len(p), 16):
        b = bytearray(p[i:i+16])
        for j in range(16):
            v = b[j]
            b[j] = (((v << 3) & 0xFF) | (v >> 5)) ^ k[j % len(k)]
        c.extend(b)
    return bytes(c)

# k = ???
# with open('final_fragment.enc', 'wb') as f:
#     f.write(encrypt(flag, k))
