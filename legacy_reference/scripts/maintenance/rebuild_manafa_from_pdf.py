import json
import sqlite3
import urllib.request
from pathlib import Path

from pypdf import PdfReader

PDF_PATH = Path(
    r"C:\Users\ahmaa\AppData\Roaming\Cursor\User\workspaceStorage\53f75b30a46f3e69adaa00a4313fd8aa\pdfs\3a29e8ae-07db-4361-bdf4-004cb1ba503c\تقرير منافع.pdf"
)


def normalize_name(value: str) -> str:
    return (value or "").lower().replace("'", "").replace("’", "").replace("`", "")


def extract_pdf_lines() -> list[str]:
    lines: list[str] = []
    reader = PdfReader(str(PDF_PATH))
    for page in reader.pages:
        text = page.extract_text() or ""
        for raw in text.splitlines():
            line = " ".join(raw.replace("\u200f", "").split()).strip()
            if line:
                lines.append(line)
    return lines


def request_json(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


conn = sqlite3.connect("local.db")
cur = conn.cursor()

platforms = cur.execute("select id, name from platforms").fetchall()
manfa_platform = next((p for p in platforms if "manfa" in normalize_name(p[1])), None)
if not manfa_platform:
    print("manfa_platform_not_found")
    raise SystemExit(1)

platform_id = manfa_platform[0]

investment_ids = [
    row[0]
    for row in cur.execute("select id from investments where platform_id=?", (platform_id,)).fetchall()
]

for investment_id in investment_ids:
    cur.execute("delete from custom_distributions where investment_id=?", (investment_id,))
    cur.execute("delete from cashflows where investment_id=?", (investment_id,))
    cur.execute("delete from cash_transactions where investment_id=?", (investment_id,))

cur.execute("delete from investments where platform_id=?", (platform_id,))
conn.commit()

lines = extract_pdf_lines()
preview = request_json(
    "http://localhost:5000/api/import/pdf/preview",
    {
        "sourceType": "pdf",
        "entityType": "investment",
        "lines": lines,
        "platformId": platform_id,
        "platformName": manfa_platform[1],
        "sectionFilter": "all",
    },
)

job_id = preview["jobId"]
commit = request_json("http://localhost:5000/api/import/commit", {"jobId": job_id})

rows = cur.execute(
    "select name, status, cast(face_value as real), cast(total_expected_profit as real) from investments where platform_id=?",
    (platform_id,),
).fetchall()
active = [r for r in rows if r[1] == "active"]
completed = [r for r in rows if r[1] == "completed"]

print(
    json.dumps(
        {
            "platform": manfa_platform[1],
            "preview_rows": preview.get("summary", {}).get("totalRows"),
            "commit_count": commit.get("committedCount"),
            "db_total": len(rows),
            "db_active_count": len(active),
            "db_completed_count": len(completed),
            "db_active_face_value": round(sum(r[2] or 0 for r in active), 2),
            "db_completed_face_value": round(sum(r[2] or 0 for r in completed), 2),
            "db_active_expected_profit": round(sum(r[3] or 0 for r in active), 2),
            "db_all_expected_profit": round(sum(r[3] or 0 for r in rows), 2),
            "sample_active_names": [r[0] for r in active],
        },
        ensure_ascii=False,
        indent=2,
    )
)
