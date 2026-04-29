# AZHUB_B0_RUNBOOK.md
**Batch 0 — Foundation: domain + env + auth wiring**

> Binding reference: `AZHUB_V2_CONSTITUTION.md`.
> This runbook is the **only** accepted path to bring `azhub.uk` from 502 → 200 without violating the constitution.
> Every step below is either a **dashboard action** (the owner performs) or a **code action** (requires owner approval per **AI-R-002**).

---

## 0. Why B0 comes first

Per §5 of `AZHUB_DIAGNOSTIC_REPORT.md`, everything else is blocked until:

1. `https://azhub.uk` serves a 200 response from the Next.js app.
2. Magic Link sign-in completes end-to-end on the production domain.
3. `/api/health` reports all four env flags as `true`.

Rule IDs touched: **DEP-R-005**, **DEP-R-007**, **AUTH-R-001**, **AUTH-R-002**, **AUTH-R-007**.
Forbidden shortcuts: do NOT add a second auth method (AUTH-R-006), do NOT skip auth on staging (AUTH-R-004), do NOT add wildcard redirect URLs (AUTH-R-007).

---

## 1. Prerequisites (owner-only, out of agent scope)

The agent **cannot** complete these without owner input — they live in external dashboards. Agent involvement: verification-only after the owner finishes.

### 1.1 Vercel — Project & domain
Confirm the GitHub repository is imported into a Vercel project and a deployment exists.

1. Vercel → *Project* → **Settings → Domains** → add `azhub.uk` (and optionally `www.azhub.uk`).
2. Vercel will show the DNS records to set. Two supported patterns:
   - `A` record `@` → `76.76.21.21`
   - `CNAME` `www` → `cname.vercel-dns.com`
3. If DNS is on Cloudflare:
   - Add the records above in Cloudflare DNS.
   - **Initially set Proxy status to DNS-only (grey cloud)** until Vercel verifies ownership and issues TLS. You MAY re-enable Cloudflare proxy later but only with SSL mode **Full (Strict)** — never "Flexible".
4. Wait until Vercel Domains shows `Valid Configuration` and a green tick.

### 1.2 Vercel — Environment variables (Production)
Open *Project → Settings → Environment Variables* and confirm the following **exactly match** `.env.example` keys (values you paste; names must be identical):

| Key | Production value |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | `https://azhub.uk` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uopqmvfbvbzyjndltctl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same publishable key currently in `.env.local` |
| `DATABASE_URL` | production connection string (see **1.2.1** for Supabase pooler checks) |
| `OWNER_EMAIL` | `ahmaaad277@gmail.com` |
| `SHARE_LINK_SECRET` | **rotate** to a fresh 32+ byte random string; do NOT reuse the default placeholder |

Rule: **DEP-R-005** — missing keys cause `/api/health` to fail; this is the gate.

### 1.2.1 `DATABASE_URL` — Supabase Transaction Pooler (Vercel app runtime)

Confirm the **Production** value in Vercel character-by-character (no truncation):

- **Host:** `*.pooler.supabase.com` (pooler hostname from the Supabase dashboard, not the direct `db.<ref>.supabase.co` host unless you intentionally use direct mode).
- **Port:** `6543` for **Transaction** mode pooler.
- **User:** `postgres.<PROJECT_REF>` (pooler username format).
- **Database:** `postgres`.
- **TLS:** URI must include `sslmode=require`, or rely on the app’s `ssl: 'require'` in [`db/index.ts`](db/index.ts) as a backstop (still prefer the query string in the secret).
- **Password:** URL-encode reserved characters (`@`, `#`, `%`, `?`, `/`, spaces, etc.).

Optional diagnostics: set `DB_ROUTE_TIMING=1` on Vercel to log latency after auth vs first DB work on key API routes; owner-only `GET /api/health/db-ping` runs `SELECT 1`.

For **`npm run db:migrate`**, if the transaction pooler rejects DDL, use a direct or session connection string from Supabase for that command only.

### 1.3 Supabase — Auth URL configuration
Open Supabase → *Authentication → URL Configuration*:

- **Site URL:** `https://azhub.uk`
- **Redirect URLs** (one per line, no wildcards):
  - `http://localhost:3000/auth/callback`
  - `https://azhub.uk/auth/callback`
  - (If you create a Vercel preview subdomain later, add its `…/auth/callback` explicitly.)

Rule: **AUTH-R-007** — no wildcards.

### 1.4 Supabase — verify owner email is allowed for Magic Link
Open Supabase → *Authentication → Users*:

- Either let the first Magic Link create the user (recommended), or
- Manually invite `ahmaaad277@gmail.com`.

The server enforces `OWNER_EMAIL` in `lib/auth.ts`, so even if anyone signs in, only that email reaches protected routes.

---

## 2. Verification gate (owner runs or agent verifies)

All three MUST pass before B0 is declared done.

### 2.1 Health endpoint
```bash
curl -sSf https://azhub.uk/api/health
```
Expected (all flags true):
```json
{
  "ok": true,
  "service": "az-finance-hub",
  "env": {
    "nodeEnv": "production",
    "databaseConfigured": true,
    "supabaseConfigured": true,
    "ownerConfigured": true
  }
}
```
If any flag is `false`, go back to §1.2.

### 2.2 Auth gate returns 401, not 500
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://azhub.uk/api/dashboard/metrics
```
Expected: `401`. If `500`, `requireOwner()` is throwing an unexpected error (check server logs).

### 2.3 Magic Link round-trip
1. Open `https://azhub.uk/login`.
2. Enter the owner email.
3. Check inbox — the link MUST point to `https://azhub.uk/auth/callback?code=…`, not `http://localhost:3000/...`.
4. Click the link → you MUST land on `/` and see the dashboard (even if empty).

If the email link points to localhost, re-check Supabase **Site URL** (§1.3).

---

## 3. Code-side items gated by owner approval

The following are small but touch guarded paths, so per **AI-R-002** the agent WILL NOT execute them until you explicitly say "approve":

### 3.1 (AUTH-R-004) Harden dev-mode layout behavior
- **File:** `app/(app)/layout.tsx:12`
- **Today:** `if (!user && process.env.NODE_ENV === "production") redirect("/login");` — in dev, unauthenticated users render the shell and trigger 401 cascades.
- **Proposal:** Always redirect when there is no session. A `SKIP_AUTH=1` env flag (opt-in, dev-only) may be introduced if you want to bypass for fast iteration.
- **Impact:** removes the "Not Authorized" toast storm locally.
- **Requires:** owner approval (touches `app/(app)/layout.tsx` — guarded area).

### 3.2 (UX-R-008) Improve generic error fallback
- **File:** `lib/api.ts:28`
- **Today:** `jsonError(e.message ?? "Internal error", status)`.
- **Proposal:** always include a short route label (e.g. `"Internal error [GET /api/dashboard/metrics]"`) and a stable request id (from headers); frontend toasts then surface that to the user.
- **Requires:** owner approval (not in the guarded list but part of UX-R-008 remediation).

### 3.3 (FIN-R-003) Replace stray `toFixed(1)` display calls
- **Files:** `app/(app)/page.tsx:342`, `app/(app)/vision/page.tsx:93`.
- **Proposal:** use `formatPercent(pct, 1)` from `lib/finance/money.ts`.
- **Requires:** owner approval.

### 3.4 (FIN F-table) Route server-side sums through `sumMoney`
- **File:** `app/api/investments/route.ts:62, 70-73`.
- **Proposal:** use `sumMoney(received.map(c => c.amount))` instead of `reduce(... + Number(c.amount), 0)`.
- **Requires:** owner approval (touches `app/api/**`).

### 3.5 (DB-R-040) Decide: reversing entry vs accept exception
- **File:** `app/api/cashflows/[id]/receive/route.ts:82-106`.
- **Option A (strict):** convert the DELETE handler to append a reversing `cash_transactions` row (negative amount, `type='withdrawal'`, `reference_id` = cashflow id) and flip `cashflows.status` back to `pending`. Preserves the audit trail.
- **Option B (accepted exception):** keep the hard delete but log an entry in `EXCEPTIONS.md` per **CHG-R-002**.
- **Requires:** owner choice.

---

## 4. What the agent WILL do (no approval needed)

These are strictly non-guarded, documentation-only actions:

1. Create / update `AZHUB_DIAGNOSTIC_REPORT.md`.
2. Create `AZHUB_B0_RUNBOOK.md` (this file).
3. Create `EXCEPTIONS.md` scaffold (empty template).
4. Update `README.md` with a pointer to `AZHUB_V2_CONSTITUTION.md` and `AGENTS.md` for discoverability (non-guarded, but kept minimal).

---

## 5. Exit criteria (B0 declared done)

All of:

- [ ] Vercel shows `azhub.uk` as `Valid Configuration`.
- [ ] Cloudflare DNS matches Vercel expectations; SSL is Full (Strict) if proxy is orange.
- [ ] `curl https://azhub.uk/api/health` returns all flags `true`.
- [ ] Magic Link round-trip completes on production URL.
- [ ] `curl https://azhub.uk/api/dashboard/metrics` without a session returns `401`.
- [ ] `SHARE_LINK_SECRET` rotated in Vercel (not the placeholder).
- [ ] `NEXT_PUBLIC_BASE_URL` in Vercel production is `https://azhub.uk`.

Once all are green, open `AZHUB_B1_RUNBOOK.md` (to be generated) to proceed.

---

## 6. Rollback

If a Vercel deploy breaks the domain:

1. Vercel → *Deployments* → find the last known good deploy → *Promote to Production*.
2. If Supabase redirect URLs were changed and auth breaks, restore the previous values in *Authentication → URL Configuration*.
3. DB is not touched in B0, so no migration rollback applies.

---

*End of AZHUB_B0_RUNBOOK.md*
