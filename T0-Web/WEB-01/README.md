# WEB-01: Polyglot File Upload

| Field | Value |
|-------|-------|
| **Tier** | 0 — External / Pre-Auth |
| **Points** | 250 |
| **Category** | Web Exploitation |
| **Difficulty** | Easy-Medium |
| **Flag** | `FLAG{web_01_polyglot_upload_x7k2}` |

## Description

A corporate file sharing portal allows employees to upload profile images. The upload form validates files by checking the `Content-Type` header but fails to verify magic bytes or sanitize file extensions — allowing a polyglot file (valid image header + PHP webshell) to be uploaded and executed.

## Challenge Architecture

```
WEB-01/
├── challenge/
│   ├── index.php          # Upload form UI
│   ├── upload.php         # Flawed upload handler
│   ├── config.php         # Flag + settings
│   ├── css/style.css      # Dark UI theme
│   └── uploads/           # Writable upload dir (PHP execution allowed)
├── solution/
│   ├── solve.py           # Automated exploit
│   └── writeup.md         # Step-by-step walkthrough
├── Dockerfile             # One-click deployment
└── README.md              # This file
```

## Vulnerability

- Upload handler checks `$_FILES['file']['type']` (client-controlled Content-Type header)
- Does NOT check file magic bytes (`GIF89a`, `\x89PNG`, etc.)
- Does NOT block `.php` extensions
- `uploads/` directory allows PHP execution

## Solution Path

1. Craft a polyglot file: GIF89a header + PHP code, saved as `shell.php`
2. Upload with Content-Type set to `image/gif`
3. Access `/uploads/shell.php` to execute commands
4. Read flag from `/var/www/flag.txt`
