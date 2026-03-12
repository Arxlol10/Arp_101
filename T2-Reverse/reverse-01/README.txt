REVERSE-01: License Key Validator
Points: 400
Difficulty: Hard

We found a license validation tool on the analyst workstation.
Reverse engineer the validation algorithm to discover the correct key.
The correct key IS the flag.

Files:
  license_validator.py  — The validator to reverse engineer

Approach:
  1. Read the source code carefully
  2. Understand the _transform() function
  3. Figure out how to reverse the transformation
  4. Apply it to the _ENCODED array to recover the key
