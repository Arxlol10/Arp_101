FORENSICS-04: Systemd Journal Binary
Points: 300
Difficulty: Medium-Hard

We recovered a binary journal export from the analyst's workstation.
Parse the structured log entries to find any secrets that were logged.

Files:
  system.journal  — Binary journal export (simplified format)

Format:
  Header: 8-byte magic "LPKSHHRH" + 4-byte version + 4-byte entry count + 16-byte reserved
  Each entry: 4-byte size prefix, then:
    2-byte marker (0xFEFE)
    8-byte timestamp (microseconds, little-endian)
    1-byte priority
    2-byte tag length + tag string
    2-byte message length + message string
    padding to 8-byte alignment

Tools that may help:
  python struct module, xxd, hexdump, strings
