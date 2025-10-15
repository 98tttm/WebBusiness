import fitz
from pathlib import Path
pdf_path = Path(r"d:\WebBusiness\medi_care\design\desgin_guild.pdf")
output_dir = pdf_path.parent / "export"
output_dir.mkdir(exist_ok=True)
doc = fitz.open(pdf_path)
for i, page in enumerate(doc):
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    out_path = output_dir / f"page_{i+1}.jpg"
    pix.save(out_path)
    print("saved", out_path)
