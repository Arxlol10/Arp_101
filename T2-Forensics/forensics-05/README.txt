FORENSICS-05: Kernel dmesg Fragment
Points: 250
Difficulty: Medium

A fragment of the kernel ring buffer was captured during analysis.
Look for any suspicious kernel module loads — parameters may contain hidden data.

Files:
  dmesg.log  — Kernel ring buffer output

Tools that may help:
  grep, strings, xxd, python
  Hint: Look for hex-encoded parameters in module load messages.
