MISC-02: EXIF Metadata Leak
Points: 200
Difficulty: Easy

This screenshot was found in the web server's upload directory.
The filename looks innocent, but images carry hidden data...

Files:
  workstation_screenshot.jpg  — Intercepted screenshot

Tools: exiftool, Pillow, piexif, strings
