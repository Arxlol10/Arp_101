FORENSICS-03: MySQL Database Extraction
Points: 250
Difficulty: Medium

The analyst workstation had a MySQL database export left behind.
Examine the dump and extract any hidden data from the session records.

Files:
  analyst_db.sql  — MySQL dump of analyst_workspace database

Tools that may help:
  grep, base64, mysql, python
  Look at BLOB fields — they often store encoded data.
