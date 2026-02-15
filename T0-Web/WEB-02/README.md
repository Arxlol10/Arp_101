# WEB-02: ImageTragick RCE

| Field | Value |
|-------|-------|
| **Tier** | 0 — External / Pre-Auth |
| **Points** | 300 |
| **Category** | Web Exploitation |
| **Difficulty** | Medium |
| **Flag** | `FLAG{web_02_imagetragick_rce_p9n7}` |

## Description

A corporate image thumbnail generator uses ImageMagick's `convert` command to resize uploaded images. The server runs a vulnerable version of ImageMagick (6.9.11-60) with a permissive `policy.xml`, making it susceptible to ImageTragick (CVE-2016-3714). Players must craft a malicious SVG/MVG file that exploits delegate processing to achieve Remote Code Execution.

## Challenge Architecture

```
WEB-02/
├── challenge/
│   ├── index.php          # Upload form + gallery UI
│   ├── upload.php         # Runs `convert` on uploads (vulnerable)
│   ├── config.php         # Settings
│   ├── css/style.css      # Dark UI theme
│   └── uploads/           # Uploaded files + thumbnails
├── solution/
│   ├── solve.py           # Automated exploit
│   └── writeup.md         # Step-by-step walkthrough
├── Dockerfile             # Apache + vulnerable ImageMagick
└── README.md              # This file
```

## Vulnerability

- `upload.php` calls `convert <input> -resize 200x200 <output>` on all uploaded files
- ImageMagick 6.9.11-60 with permissive `policy.xml` allows delegate exploitation
- CVE-2016-3714: Crafted SVG/MVG files can inject shell commands via delegate processing
- `image over` directive processes URLs through delegates, enabling command injection

## Solution Path

1. Notice "Powered by ImageMagick" in the footer
2. Upload a normal image and see thumbnail is generated
3. Research ImageTragick (CVE-2016-3714)
4. Craft malicious SVG with command injection in `image over` URL
5. Upload SVG → `convert` processes it → command executes
6. Read flag from `/var/www/flags/web02/flag.txt` (e.g., `cat` it to uploads dir and fetch the output file)

> **Note:** Outbound network connections are blocked. Reverse shells will not work. Focus on reading the flag file and writing it to a retrievable location.

