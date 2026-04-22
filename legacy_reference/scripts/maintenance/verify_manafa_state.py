import sqlite3


def normalize_name(value: str) -> str:
    return (value or "").lower().replace("'", "").replace("’", "").replace("`", "")


conn = sqlite3.connect("local.db")
cur = conn.cursor()

platforms = cur.execute("select id, name from platforms").fetchall()
platform = next((p for p in platforms if "manfa" in normalize_name(p[1])), None)
if not platform:
    print("manfa_platform_not_found")
    raise SystemExit(1)

rows = cur.execute(
    "select name, status, cast(face_value as real), cast(total_expected_profit as real) from investments where platform_id=?",
    (platform[0],),
).fetchall()

cash_rows = cur.execute(
    "select type, cast(amount as real), platform_id, investment_id from cash_transactions"
).fetchall()

active = [r for r in rows if r[1] == "active"]
completed = [r for r in rows if r[1] == "completed"]

print("platform:", platform[1])
print("total:", len(rows))
print("active:", len(active))
print("completed:", len(completed))
print("active_face_value:", round(sum(r[2] or 0 for r in active), 2))
print("completed_face_value:", round(sum(r[2] or 0 for r in completed), 2))
print("active_expected_profit:", round(sum(r[3] or 0 for r in active), 2))
print("all_expected_profit:", round(sum(r[3] or 0 for r in rows), 2))
print("active_names:", [r[0] for r in active])

manfa_investment_ids = {
    row[0]
    for row in cur.execute("select id from investments where platform_id=?", (platform[0],)).fetchall()
}

manfa_cash = 0.0
for tx_type, amount, platform_id, investment_id in cash_rows:
    affects_manfa = platform_id == platform[0] or (investment_id in manfa_investment_ids)
    if not affects_manfa:
        continue
    value = amount or 0.0
    if tx_type in ("deposit", "distribution"):
        manfa_cash += value
    elif tx_type in ("withdrawal", "investment"):
        manfa_cash -= value

print("manfa_cash_balance_estimate:", round(manfa_cash, 2))
