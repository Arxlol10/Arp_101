# WEB-03: JWT Secret Leak

| Field | Value |
|-------|-------|
| **Tier** | 0 — External / Pre-Auth |
| **Points** | 300 |
| **Category** | Web Exploitation |
| **Difficulty** | Medium |
| **Flag** | `FLAG{web_03_jwt_secret_leak_q2w8}` |

## Description

A corporate portal uses JWT-based authentication. The login page loads several JavaScript modules, including an obfuscated authentication module (`auth.min.js`) that contains the JWT signing secret hidden behind multiple layers of obfuscation. Players must reverse-engineer the JavaScript, identify the real secret among several decoy secrets, forge an admin JWT token, and access the protected `/admin/` panel to retrieve the flag.

## Challenge Architecture

```
WEB-03/
├── challenge/
│   ├── index.php              # Login page + API handler
│   ├── config.php             # JWT secret + settings
│   ├── js/
│   │   ├── auth.min.js        # Obfuscated — contains real JWT secret
│   │   ├── analytics.min.js   # Decoy — contains fake secret
│   │   └── config.bundle.js   # Decoy — contains fake JWT signingKey
│   ├── admin/index.php        # JWT-protected admin panel (flag here)
│   └── css/style.css          # Dark UI theme
├── solution/
│   ├── solve.py               # Automated exploit
│   └── writeup.md             # Step-by-step walkthrough
├── Dockerfile                 # Apache + PHP deployment
└── README.md                  # This file
```

## Vulnerability

- `js/auth.min.js` contains the JWT signing secret obfuscated as a hex charCode array
- The secret is stored in `_0x8d1a` array and decoded at runtime via `String.fromCharCode()`
- Variable names are mangled — the secret is assigned to `_0x9f3d._k` (not `secret`)
- String literals use a rotated string array pattern (`_0x4a7b` + rotation function)
- Two decoy JS files contain plausible-looking fake secrets to mislead players
- `/admin/` endpoint only checks JWT signature and `role: admin` claim
- No additional server-side session tracking — forged tokens are accepted

## Obfuscation Layers

| Layer | Technique | Purpose |
|-------|-----------|---------|
| 1 | String array rotation (`_0x4a7b`) | All string literals obfuscated |
| 2 | Hex charCode array (`_0x8d1a`) | Secret stored as hex bytes |
| 3 | Property renaming (`_k` not `secret`) | grep for "secret" finds nothing |
| 4 | Decoy variables in auth.min.js | `_0xdecoy1`, `_0xdecoy2` |
| 5 | Decoy files (analytics, config) | Fake secrets in other JS files |

## Solution Path

1. View page source → notice 3 JS files loaded
2. Inspect all JS files → find fake secrets in `analytics.min.js` and `config.bundle.js`
3. Focus on `auth.min.js` — deobfuscate using a JS beautifier or DevTools debugger
4. Find the hex charCode array `_0x8d1a` → decode it: `s3cr3t_k3y_d0nt_l34k`
5. Verify this is the real secret by tracing it to the JWT config object
6. Forge JWT with `{"sub":"admin","role":"admin"}` and sign with the secret
7. Set `auth_token` cookie with forged JWT
8. Access `/admin/` → flag revealed
