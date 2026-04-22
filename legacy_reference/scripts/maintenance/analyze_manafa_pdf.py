import re
from pathlib import Path
from pypdf import PdfReader

pdf_path = Path(
    r"C:\Users\ahmaa\AppData\Roaming\Cursor\User\workspaceStorage\53f75b30a46f3e69adaa00a4313fd8aa\pdfs\3a29e8ae-07db-4361-bdf4-004cb1ba503c\تقرير منافع.pdf"
)

pattern = re.compile(
    r"^(\d+(?:\.\d+)?)\s*%\s+(\d{2}/\d{2}/\d{4})\s+a\s+([\d,]+\.\d{2})\s+(OID-[A-Za-z0-9-]+)\s+(\d{2}/\d{2}/\d{4})$",
    re.I,
)


def normalize(line: str) -> str:
    return re.sub(r"\s+", " ", line.replace("\u200f", "")).strip()


reader = PdfReader(str(pdf_path))
section = "unknown"
rows = []
for page in reader.pages:
    text = page.extract_text() or ""
    for raw in text.splitlines():
        line = normalize(raw)
        if not line:
            continue
        if "اﻻﺳﺘﺜﻤﺎرات اﻟﻘﺎﺋﻤﺔ" in line:
            section = "active"
            continue
        if "اﻻﺳﺘﺜﻤﺎرات اﻟﻤﻐﻠﻘﺔ" in line:
            section = "closed"
            continue
        m = pattern.match(line)
        if not m:
            continue
        amount = float(m.group(3).replace(",", ""))
        rows.append((section, amount, m.group(4)))

active = [r for r in rows if r[0] == "active"]
closed = [r for r in rows if r[0] == "closed"]
unknown = [r for r in rows if r[0] == "unknown"]

print("total_rows:", len(rows))
print("active_count:", len(active), "active_sum:", round(sum(x[1] for x in active), 2))
print("closed_count:", len(closed), "closed_sum:", round(sum(x[1] for x in closed), 2))
print("unknown_count:", len(unknown), "unknown_sum:", round(sum(x[1] for x in unknown), 2))
