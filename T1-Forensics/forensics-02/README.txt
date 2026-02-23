FORENSICS-02: Deleted File Recovery
Points: 250
Difficulty: Medium

We found this disk image on the suspect's USB drive.
A file was deleted, but can you recover what was erased?

Files:
  disk.img  — Raw FAT12 disk image (512KB)

Tools that may help:
  foremost, photorec, testdisk, xxd, strings
  Python: open('disk.img', 'rb') and scan for patterns
