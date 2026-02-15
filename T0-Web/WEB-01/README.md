# WEB-01: Polyglot File Upload

| Field | Value |
|-------|-------|
| **Tier** | 0 — External / Pre-Auth |
| **Points** | 250 |
| **Category** | Web Exploitation |
| **Difficulty** | Medium |
| **Flag** | `FLAG{web_01_polyglot_upload_bypass_k8m3}` |

## Description

A corporate profile picture upload portal validates uploaded files using finfo MIME type detection, magic byte verification, and an extension blacklist. However, the `.pht` extension is missing from the blocklist, and the upload path is predictable via an MD5 hash leaked in the `X-Upload-Time` response header — allowing a PNG+PHP polyglot webshell to be uploaded and executed.

## Challenge Architecture

```
WEB-01/
├── challenge/
│   ├── index.php          # Upload form UI
│   ├── upload.php         # Vulnerable upload handler
│   ├── config.php         # Settings
│   ├── css/style.css      # Dark UI theme
│   └── uploads/           # Writable upload dir (.pht executes as PHP)
├── solution/
│   ├── solve.py           # Automated exploit
│   └── writeup.md         # Step-by-step walkthrough
├── Dockerfile             # Nginx + PHP-FPM deployment
└── README.md              # This file
```

## Vulnerabilities

1. **Extension blacklist gap**: Blocks `php, php3, php4, php5, phtml` but NOT `.pht`
2. **Nginx misconfiguration**: `location ~ \.(php|pht)$` enables PHP execution for `.pht` files
3. **Predictable upload path**: `MD5(timestamp + client_IP)[:8]` — timestamp leaked via `X-Upload-Time` header
4. **Polyglot bypass**: Valid PNG header + PHP code after IEND marker passes finfo and magic byte checks

## Solution Path

1. Craft a polyglot file: valid PNG header + PHP webshell after IEND, saved as `shell.pht`
2. Upload with valid image Content-Type
3. Note the `X-Upload-Time` response header
4. Calculate upload path: `md5(timestamp + your_ip)[:8]`
5. Access `/uploads/<hash>/shell.pht` to execute PHP code
6. Read flag using PHP file functions: `<?php echo file_get_contents('/var/www/flags/web01/flag.txt'); ?>`

> **Note:** Shell functions (`system`, `exec`, `passthru`, etc.) are disabled. Use PHP file I/O (`file_get_contents`, `readfile`, `fopen`) to read the flag.

