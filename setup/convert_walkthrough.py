
import markdown
import sys
from xhtml2pdf import pisa

# Input and Output paths
input_md = r"C:\Users\Antony\.gemini\antigravity\brain\b1d511ed-c58e-422c-9888-692285ac74c3\walkthrough.md"
output_pdf = "walkthrough.pdf"

# 1. Read Markdown
with open(input_md, "r", encoding="utf-8") as f:
    text = f.read()

# 2. Convert to HTML
# Use extra extension to support tables
html_content = markdown.markdown(text, extensions=['tables', 'fenced_code', 'codehilite'])

# 3. Add some CSS for better PDF look
css = """
<style>
    body { font-family: Helvetica, sans-serif; font-size: 12px; }
    h1 { font-size: 24px; color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
    h2 { font-size: 18px; color: #e74c3c; margin-top: 20px; }
    h3 { font-size: 14px; color: #34495e; margin-top: 15px; }
    pre { background-color: #f4f4f4; padding: 10px; border: 1px solid #ddd; font-family: monospace; white-space: pre-wrap; }
    code { font-family: monospace; background-color: #f4f4f4; padding: 2px 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #bdc3c7; padding: 8px; text-align: left; }
    th { background-color: #ecf0f1; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
</style>
"""

full_html = f"<html><head>{css}</head><body>{html_content}</body></html>"

# 4. Convert HTML to PDF
with open(output_pdf, "wb") as pdf_file:
    pisa_status = pisa.CreatePDF(full_html, dest=pdf_file)

if pisa_status.err:
    print("Error generating PDF")
    sys.exit(1)

print(f"Successfully created {output_pdf}")
