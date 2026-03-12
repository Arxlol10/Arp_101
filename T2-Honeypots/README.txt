T2-Honeypots: Tier 2 Decoy Files
Penalty: -50 pts each

These files are planted in visible locations accessible to the analyst user.
They look enticing but submitting any flag found here loses points.

Files:
  engineer_password.txt    — Fake engineer credentials
  .secret_key              — Fake API key file
  database_backup.sql      — SQL dump with flag in comment
  id_rsa_engineer          — Fake SSH private key
  config.enc               — Fake "encrypted" config (just base64)
  .bash_history_leak       — Suspicious bash history
  escalation_notes.md      — Fake pentest notes

WARNING: Think before you submit! Not everything that looks like a flag IS a real flag.
