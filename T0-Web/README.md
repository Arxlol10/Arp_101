# T0-Web — Web Exploitation Challenges

> **Tier 0 · External / Pre-Auth** — Three progressive web challenges targeting common real-world vulnerabilities.

---

## Challenge Overview

| # | Challenge | Vulnerability | Points | Difficulty |
|---|-----------|--------------|--------|------------|
| WEB-01 | **Polyglot File Upload** | `.pht` extension bypass + predictable upload path | 100 | Medium |
| WEB-02 | **ImageTragick RCE** | CVE-2016-3714 — ImageMagick delegate command injection | 100 | Medium |
| WEB-03 | **JWT Secret Leak** | Obfuscated JS leaks JWT signing secret → admin token forgery | 100 | Medium |

---

## Repository Structure

```
T0-Web/
├── README.md                  # This file — full challenge documentation
├── setup_ctf.sh               # VM provisioning script (Ubuntu Server)
├── WEB-01/                    # Polyglot File Upload challenge
│   ├── challenge/
│   │   ├── index.php          # Upload form UI (SecureShare portal)
│   │   ├── upload.php         # Vulnerable upload handler
│   │   ├── config.php         # Extension blacklist, MIME settings
│   │   ├── css/style.css      # Dark themed UI
│   │   ├── flag.txt           # Local dev flag
│   │   └── uploads/           # Writable upload directory
│   ├── solution/              # Solve script + writeup (TODO)
│   ├── Dockerfile             # Nginx + PHP-FPM (hardened)
│   └── README.md              # Challenge-specific README
├── WEB-02/                    # ImageTragick RCE challenge
│   ├── challenge/
│   │   ├── index.php          # Upload form + thumbnail gallery (ThumbnailGen)
│   │   ├── upload.php         # Runs ImageMagick `convert` on uploads
│   │   ├── config.php         # MIME/size settings
│   │   ├── css/style.css      # Dark themed UI
│   │   ├── flag.txt           # Local dev flag
│   │   └── uploads/           # Uploaded files + generated thumbnails
│   ├── solution/
│   │   ├── solve.py           # Automated SVG/MVG exploit script
│   │   └── writeup.md         # Step-by-step walkthrough
│   ├── Dockerfile             # Apache + vulnerable ImageMagick (hardened)
│   └── README.md              # Challenge-specific README
└── WEB-03/                    # JWT Secret Leak challenge
    ├── challenge/
    │   ├── index.php           # Login page + /api/login handler (CorpPortal)
    │   ├── config.php          # JWT secret, admin credentials
    │   ├── js/
    │   │   ├── auth.min.js     # Obfuscated — contains REAL JWT secret
    │   │   ├── analytics.min.js# Decoy — fake secret
    │   │   └── config.bundle.js# Decoy — fake JWT signingKey
    │   ├── admin/index.php     # JWT-protected admin panel (returns flag)
    │   ├── css/style.css       # Dark themed UI
    │   └── flag.txt            # Local dev flag
    ├── solution/
    │   ├── solve.py            # Automated JWT forgery exploit
    │   └── writeup.md          # Step-by-step walkthrough
    ├── Dockerfile              # Apache + PHP (with mod_rewrite)
    └── README.md               # Challenge-specific README
```

---

## WEB-01 — Polyglot File Upload (.pht Bypass)

**Points:** 250 · **Flag:** `FLAG{web_01_polyglot_upload_bypass_k8m3}`

### Description

A corporate profile picture upload portal ("SecureShare") validates uploads using `finfo` MIME type detection, magic byte verification, and an extension blacklist. However, the `.pht` extension is missing from the blocklist, and the upload path is predictable via an MD5 hash leaked in the `X-Upload-Time` response header.

### Vulnerabilities

| # | Vulnerability | Detail |
|---|--------------|--------|
| 1 | Extension blacklist gap | Blocks `php, php3, php4, php5, phtml` but **NOT `.pht`** |
| 2 | Nginx misconfiguration | `location ~ \.(php\|pht)$` enables PHP execution for `.pht` |
| 3 | Predictable upload path | `MD5(timestamp + client_IP)[:8]` — timestamp leaked via `X-Upload-Time` |
| 4 | Polyglot bypass | Valid PNG header + PHP code after IEND passes MIME + magic checks |

### Solution Path

1. Craft a polyglot file: valid PNG header + PHP webshell after IEND, saved as `shell.pht`
2. Upload with valid image `Content-Type`
3. Note the `X-Upload-Time` response header
4. Calculate upload path: `md5(timestamp + your_ip)[:8]`
5. Access `/uploads/<hash>/shell.pht` to execute PHP code
6. Read flag: `<?php echo file_get_contents('/var/www/flags/web01/flag.txt'); ?>`

> **Note:** Shell functions (`system`, `exec`, `passthru`, etc.) are disabled via `disable_functions`. Use PHP file I/O (`file_get_contents`, `readfile`, `fopen`) to read the flag.

---

## WEB-02 — ImageTragick RCE (CVE-2016-3714)

**Points:** 300 · **Flag:** `FLAG{web_02_imagetragick_rce_p9n7}`

### Description

A corporate image thumbnail generator ("ThumbnailGen") uses ImageMagick's `convert` command to resize uploaded images. The server runs a vulnerable version of ImageMagick with a permissive `policy.xml`, making it susceptible to ImageTragick (CVE-2016-3714). Players must craft a malicious SVG/MVG file that exploits delegate processing to achieve RCE.

### Vulnerabilities

| # | Vulnerability | Detail |
|---|--------------|--------|
| 1 | Unsafe `convert` execution | `upload.php` passes uploads directly to ImageMagick `convert` |
| 2 | Permissive policy.xml | All coders, delegates, and `@*` path patterns allowed |
| 3 | CVE-2016-3714 | SVG/MVG `image over` directive injects shell commands via delegates |

### Solution Path

1. Notice "Powered by ImageMagick" in the footer
2. Upload a normal image → observe thumbnail generation
3. Research ImageTragick (CVE-2016-3714)
4. Craft malicious SVG with command injection in `image over` URL:
   ```
   push graphic-context
   viewbox 0 0 640 480
   image over 0,0 0,0 'https://example.com/x.jpg"|cat /var/www/flags/web02/flag.txt > /var/www/html/uploads/flag_output.txt"'
   pop graphic-context
   ```
5. Upload SVG → `convert` processes it → command executes
6. Retrieve `http://target/uploads/flag_output.txt`

> **Note:** Outbound network connections are blocked via iptables. Reverse shells will not work. Read the flag file and write it to a retrievable location instead.

---

## WEB-03 — JWT Secret Leak (Obfuscated JavaScript)

**Points:** 300 · **Flag:** `FLAG{web_03_jwt_secret_leak_q2w8}`

### Description

A corporate portal ("CorpPortal") uses JWT-based authentication. The login page loads several JavaScript modules, including an obfuscated `auth.min.js` that contains the JWT signing secret hidden behind multiple layers of obfuscation. Players must reverse-engineer the JavaScript, identify the real secret among decoy secrets, forge an admin JWT, and access the protected `/admin/` panel to retrieve the flag.

### Vulnerabilities

| # | Vulnerability | Detail |
|---|--------------|--------|
| 1 | Secret in client-side JS | JWT signing secret embedded in `auth.min.js` |
| 2 | Obfuscation only | Security by obscurity — no server-side secret rotation |
| 3 | No session tracking | Server only checks JWT signature + `role: admin` claim |

### Obfuscation Layers

| Layer | Technique | Purpose |
|-------|-----------|---------|
| 1 | String array rotation (`_0x4a7b`) | All string literals obfuscated |
| 2 | Hex charCode array (`_0x8d1a`) | Secret stored as hex bytes |
| 3 | Property renaming (`_k` not `secret`) | `grep` for "secret" finds nothing |
| 4 | Decoy variables in `auth.min.js` | `_0xdecoy1`, `_0xdecoy2` |
| 5 | Decoy JS files | Fake secrets in `analytics.min.js` and `config.bundle.js` |

### Red Herrings

| File | Fake Secret | Why it fails |
|------|-------------|-------------|
| `analytics.min.js` | `f4k3_4n4lyt1cs_k3y_x7m9` | Wrong signing key |
| `config.bundle.js` | `pr0d_s1gn1ng_k3y_2024_v4` | Wrong signing key |
| `config.bundle.js` | hex → `corp_api_k3y_pr0d` | API key, not JWT secret |
| `auth.min.js` | `_0xdecoy1` (base64) | Decodes to garbage |
| `auth.min.js` | `_0xdecoy2` → `not_the_real_key` | Obvious decoy |

### Solution Path

1. View page source → 3 JS files loaded: `config.bundle.js`, `analytics.min.js`, `auth.min.js`
2. Inspect all JS files — find and **dismiss** fake secrets
3. Focus on `auth.min.js` → deobfuscate using a JS beautifier or DevTools debugger
4. Find hex charCode array `_0x8d1a` → decode: `s3cr3t_k3y_d0nt_l34k`
5. Forge JWT: `{"sub":"admin","role":"admin"}` signed with HS256
6. Set `auth_token` cookie with forged JWT
7. Access `/admin/` → flag revealed

---

## Deployment

### Docker (Per-Challenge Testing)

```bash
# WEB-01 — Polyglot Upload
cd WEB-01 && docker build -t web01 . && docker run -p 8001:80 web01

# WEB-02 — ImageTragick RCE
cd WEB-02 && docker build -t web02 . && docker run -p 8002:80 web02

# WEB-03 — JWT Secret Leak
cd WEB-03 && docker build -t web03 . && docker run -p 8003:80 web03
```

### VM Provisioning (Production CTF)

Run `setup_ctf.sh` as root on a fresh Ubuntu Server install:

```bash
chmod +x setup_ctf.sh
sudo ./setup_ctf.sh
```

This will deploy all three challenges on ports **8001**, **8002**, and **8003** with full hardening.

---

## Hardening

Both the Dockerfiles and `setup_ctf.sh` implement identical hardening measures:

| Measure | WEB-01 | WEB-02 | WEB-03 |
|---------|--------|--------|--------|
| **Per-challenge user isolation** | `web01` | `web02` | `web03` |
| **PHP `disable_functions`** | All shell/process/network | All except `exec` (needed for `safe_convert`) | All shell/process/network |
| **PHP `open_basedir`** | `/var/www/web01/` + flag dir + `/tmp/` | `/var/www/web02/` + flag dir + `/tmp/` | `/var/www/web03/` + flag dir + `/tmp/` |
| **iptables outbound DROP** | ✅ No reverse shells | ✅ No reverse shells | ✅ No reverse shells |
| **Flag isolation** | `640 root:web01` | `640 root:web02` | `640 root:web03` |
| **Restricted binaries** | `nc, python, perl, ruby, wget, curl, nmap, gcc` → `750 root:root` | Same | Same |
| **URL fopen/include** | Off | Off | Off |
| **safe_convert wrapper** | — | ✅ Restricts `convert` to uploads dir only | — |

### Flag Locations

| Challenge | Docker Path | VM Path |
|-----------|-------------|---------|
| WEB-01 | `/var/www/flags/web01/flag.txt` | `/var/www/flags/web01/flag.txt` |
| WEB-02 | `/var/www/flags/web02/flag.txt` | `/var/www/flags/web02/flag.txt` |
| WEB-03 | `/var/www/flags/web03/flag.txt` | `/var/www/flags/web03/flag.txt` |

---

## Files Changed (from initial commit)

### Modified
- `T0-Web/README.md` — Updated challenge types/names in overview table
- `T0-Web/WEB-01/Dockerfile` — Rewritten: Nginx + PHP-FPM with .pht execution + hardening
- `T0-Web/WEB-01/README.md` — Complete rewrite for Polyglot Upload challenge
- `T0-Web/WEB-01/challenge/config.php` — New extension blacklist config (missing .pht)
- `T0-Web/WEB-01/challenge/index.php` — New SecureShare upload portal UI
- `T0-Web/WEB-02/Dockerfile` — Rewritten: Apache + vulnerable ImageMagick + hardening
- `T0-Web/WEB-02/README.md` — Complete rewrite for ImageTragick challenge
- `T0-Web/WEB-02/challenge/config.php` — New MIME/size settings for ImageTragick
- `T0-Web/WEB-02/challenge/css/style.css` — Redesigned dark UI theme
- `T0-Web/WEB-02/challenge/index.php` — New ThumbnailGen upload + gallery UI
- `T0-Web/WEB-02/solution/solve.py` — Rewritten: multi-payload ImageTragick exploit
- `T0-Web/WEB-03/Dockerfile` — Simplified: Apache + PHP + mod_rewrite
- `T0-Web/WEB-03/README.md` — Complete rewrite for JWT Secret Leak challenge
- `T0-Web/WEB-03/challenge/config.php` — New JWT secret + admin credentials
- `T0-Web/WEB-03/challenge/css/style.css` — Redesigned dark UI theme
- `T0-Web/WEB-03/challenge/index.php` — New CorpPortal login page + API handler
- `T0-Web/WEB-03/solution/solve.py` — Rewritten: JS deobfuscation + JWT forgery exploit
- `T0-Web/WEB-03/solution/writeup.md` — Complete rewrite with obfuscation walkthrough

### Added
- `T0-Web/setup_ctf.sh` — Full VM provisioning script (user isolation, PHP-FPM pools, Nginx, iptables, hardening)
- `T0-Web/WEB-01/challenge/upload.php` — Vulnerable upload handler with .pht gap
- `T0-Web/WEB-01/challenge/flag.txt` — Local development flag
- `T0-Web/WEB-02/challenge/upload.php` — ImageMagick `convert` trigger
- `T0-Web/WEB-02/challenge/flag.txt` — Local development flag
- `T0-Web/WEB-02/solution/writeup.md` — ImageTragick exploitation walkthrough
- `T0-Web/WEB-03/challenge/admin/index.php` — JWT-protected admin panel (returns flag)
- `T0-Web/WEB-03/challenge/js/auth.min.js` — Obfuscated JS with real JWT secret
- `T0-Web/WEB-03/challenge/js/analytics.min.js` — Decoy JS with fake secret
- `T0-Web/WEB-03/challenge/js/config.bundle.js` — Decoy JS with fake signingKey
- `T0-Web/WEB-03/challenge/flag.txt` — Local development flag

### Deleted
- `README.md` — Root-level README (moved to `T0-Web/`)
- `T0-Web/WEB-01/solution/solve.py` — Old polyglot exploit (challenge redesigned)
- `T0-Web/WEB-02/challenge/pages/` — Removed LFI page files (`about.php`, `contact.php`, `docs.php`, `home.php`, `team.php`)
- `T0-Web/WEB-03/Dockerfile.internal` — Removed separate internal API container
- `T0-Web/WEB-03/challenge/internal_api.php` — Removed SSRF target (challenge redesigned)
- `T0-Web/WEB-03/docker-compose.yml` — Removed multi-container setup (now single container)
