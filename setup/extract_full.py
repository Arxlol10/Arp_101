import fitz

doc = fitz.open(r'e:\REDTEAM_CTF\Hybrid_CTF_Format.pdf')
for i, page in enumerate(doc):
    text = page.get_text()
    print(f"=== PAGE {i+1} ===")
    print(text)
    print()
