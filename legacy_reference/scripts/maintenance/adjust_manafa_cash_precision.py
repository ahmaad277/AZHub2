import sqlite3

TARGET = 32490.16

conn = sqlite3.connect("local.db")
cur = conn.cursor()

tx = cur.execute(
    """
    select id, cast(amount as real)
    from cash_transactions
    where type='deposit'
      and (investment_id is null or investment_id = '')
    order by date desc
    limit 1
    """
).fetchone()

if not tx:
    print("no_deposit_found")
    raise SystemExit(0)

tx_id, amount = tx
if abs((amount or 0) - TARGET) < 0.0001:
    print("already_precise", TARGET)
    raise SystemExit(0)

cur.execute("update cash_transactions set amount=? where id=?", (f"{TARGET:.2f}", tx_id))
conn.commit()
print("updated_tx", tx_id, "old", amount, "new", TARGET)
