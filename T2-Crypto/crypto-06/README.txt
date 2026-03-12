CRYPTO-06: Encrypted Bash History
Points: 300
Difficulty: Medium

The analyst user encrypted their .bash_history before logging out.
We recovered the encrypted file and a note left behind.

Files:
  encrypted_bash_history.enc  — AES-CBC encrypted bash history
  analyst_note.txt            — Note left by the analyst

Hints:
  - The file is encrypted with AES-128-CBC
  - Key was derived using PBKDF2 (SHA-256, 100000 iterations)
  - The passphrase follows the pattern: <username><year>
  - Salt: redteam_salt_2024
