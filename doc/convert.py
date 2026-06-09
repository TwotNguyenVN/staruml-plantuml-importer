import sys
import subprocess

# Install markitdown if not present
try:
    import markitdown
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'markitdown'])

from markitdown import MarkItDown
md = MarkItDown()

files = [
    r"d:\Documents\CODE\staruml-mcp-server\doc\huong_dan_1.docx",
    r"d:\Documents\CODE\staruml-mcp-server\doc\huong_dan_2.docx",
    r"d:\Documents\CODE\staruml-mcp-server\doc\huong_dan_tong_quan.docx"
]

for f in files:
    try:
        result = md.convert(f)
        out_f = f.replace(".docx", ".md")
        with open(out_f, "w", encoding="utf-8") as out:
            out.write(result.text_content)
        print(f"Converted {f} to {out_f}")
    except Exception as e:
        print(f"Failed to convert {f}: {e}")
