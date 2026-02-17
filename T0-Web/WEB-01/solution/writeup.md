# WEB-01 Writeup: Polyglot File Upload

## Challenge Overview
**Points:** 250
**Goal:** Upload a PHP webshell disguised as an image to retrieve the flag.

## Vulnerabilities
1. **Extension Blacklist Bypass**: The upload filter blocks `.php` but allows `.pht` (which is configured to run as PHP in Nginx).
2. **Predictable Upload Path**: The upload directory is an MD5 hash of `filename + timestamp + IP`. The server leaks the timestamp and IP in the HTML source code, allowing players to predict the path.
3. **Polyglot Files**: `finfo` and magic byte checks can be bypassed by placing valid PNG headers before the PHP code.

## Solution Steps

### Step 1: Reconnaissance
The upload page mentions it accepts PNG/JPG/GIF. trying to upload `shell.php` fails due to "Invalid Extension". However, checking the source code (`Ctrl+U`) reveals a hidden comment in the footer:

```html
<!-- Server Time: 1771234567 | Client IP: 192.168.1.5 -->
```

This gives us the exact server time and how the server sees our IP.

### Step 2: Path Prediction Logic
The upload script uses this logic to create the directory:
```php
$hash = md5($timestamp . $client_ip);
$upload_dir = substr($hash, 0, 8);
```
By using the leaked values, we can calculate where our file will land.

### Step 3: Crafting the Polyglot
We need a file that looks like a PNG but executes PHP code. A simple way is to add the PNG magic bytes at the start:

```php
\x89\x50\x4E\x47\x0D\x0A\x1A\x0A<?php echo file_get_contents('/var/www/flags/web01/flag.txt'); ?>
```

Save this as `shell.pht`.

### Step 4: Exploitation
1. Upload `shell.pht`.
2. Calculate the hash using the leaked timestamp/IP. Note: The upload might happen 1-2 seconds after you loaded the page, so brute-force a small window.
3. Access `/uploads/<hash>/shell.pht`.
4. The PHP code executes and prints the flag.

**Flag:** `FLAG{web_01_polyglot_upload_bypass_k8m3}`
