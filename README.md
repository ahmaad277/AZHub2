# A.Z Finance Hub — v2.0

Personal Sukuk & Fixed-Income Portfolio Management System. A single-user financial command center with strict **Single Source of Truth (SSOT)** architecture, an atomic cash ledger, and computed investment statuses.

Built with **Next.js 15 (App Router) + Supabase (Postgres + Auth) + Drizzle ORM + Tailwind + shadcn/ui**.

---

## 0. Governance (READ FIRST)

Before any human or AI agent modifies code in this repository:

1. Read [`AZHUB_V2_CONSTITUTION.md`](./AZHUB_V2_CONSTITUTION.md) end-to-end (binding).
2. Arabic summary of the non-negotiable rules: [`AZHUB_V2_DUSTUR_AR.md`](./AZHUB_V2_DUSTUR_AR.md).
3. AI agents: see [`AGENTS.md`](./AGENTS.md) and the Cursor rule in `.cursor/rules/azhub-constitution.mdc`.
4. Current health audit: [`AZHUB_DIAGNOSTIC_REPORT.md`](./AZHUB_DIAGNOSTIC_REPORT.md).
5. Active foundation work: [`AZHUB_B0_RUNBOOK.md`](./AZHUB_B0_RUNBOOK.md).
6. Any approved rule exception MUST be recorded in [`EXCEPTIONS.md`](./EXCEPTIONS.md) (per **CHG-R-002**).

---

## 1. Features

- **Dashboard** with 9 canonical portfolio metrics (NAV, Active Principal, Cash Drag, Realized Gains, WAM, Default Rate, Active Annual Yield, Inflow 30/60/90).
- **Investment Wizard** with smart date toggle (**duration ↔ end date**), live schedule preview, custom schedule editor, and funding source question (internal wallet vs external bank).
- **Atomic cashflow receipt**: marking a cashflow as received is a single transaction that both updates the cashflow and inserts a `cashflow_receipt` ledger entry.
- **Cash Wallet** — pure ledger: deposits, withdrawals, investment fundings, and cashflow receipts.
- **Platforms** CRUD with fee configuration.
- **Vision 2040** target setting and monthly target planner.
- **Alerts Center** with automatic generation.
- **Data Quality Center** — scans for investments without cashflows, profit/principal mismatches, orphaned data, etc.
- **Reports** — PDF, Excel, JSON exports (AI-friendly structured export).
- **Portfolio Snapshots** — full backup & one-click restore.
- **CSV / XLSX Import** — preview before commit, with row-level errors.
- **Data Entry Share Links** — generate a public, time-limited URL for someone else to submit investments; entries are flagged `needsReview` for owner approval.
- **Settings** — language (AR/EN), theme, view mode (Pro/Lite), font size, currency, alert preferences.
- **PWA** — installable with offline cache.

---

## 2. Architecture Principles

| Principle | Enforcement |
|-----------|-------------|
| Single Source of Truth | All financial aggregations live in `lib/finance/metrics.ts`. Frontend never aggregates. |
| Double-entry cash ledger | Cashflow receipts are atomic DB transactions — `cashflows.status='received'` + `cash_transactions(type='cashflow_receipt')`. |
| Computed statuses | No manual `status` column on investments. Status is derived via `investment_status_view`. |
| Schema introspection | Every DB column has a SQL comment so future LLMs can query the DB safely. |

See `lib/finance/` for the canonical math (money rounding, schedule generation, status resolution).

---

## 3. Data Model

All tables are defined in `db/schema.ts`:

- `platforms`, `investments`, `cashflows` (with `is_custom_schedule`, merged from legacy `custom_distributions`)
- `cash_transactions` (the ledger, with CHECK constraints)
- `vision_targets`, `user_settings`, `alerts`, `data_quality_issues`
- `portfolio_snapshots`, `share_links`, `import_jobs`
- View: `investment_status_view` (derives active / late / defaulted / completed)

---

## 4. Getting Started

### 4.1. Requirements
- Node.js 20+
- A Supabase project (free tier is enough)

### 4.2. Environment

Copy `.env.example` to `.env.local` and fill in:

```
PORT=3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
OWNER_EMAIL=your@email.com
SHARE_LINK_SECRET=change-me-random-32-bytes
```

Notes:
- `PORT` is optional locally; `next dev` defaults to `3000`.
- There is no separate backend host in v2. The API is served from the same origin under `/api/*`.
- `OWNER_EMAIL` is enforced on every protected route — the app is strictly single-user.
- The login UI can present a PIN-only experience, while Supabase still authenticates the owner account behind the scenes.

### 4.3. Install & setup

```bash
npm install
npm run db:migrate     # applies Drizzle migrations + `db/sql/*.sql` (includes `investment_status_view`)
npm run db:seed        # seeds default platforms (Sukuk, Manafa, Lendo)
npm run dev
```

Then open `http://localhost:3000` and sign in with the owner PIN/password configured for `OWNER_EMAIL` inside Supabase Auth.

Useful local checks:

```text
App:        http://localhost:3000
Health:     http://localhost:3000/api/health
Metrics:    http://localhost:3000/api/dashboard/metrics   (after owner login)
```

---

## 5. Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local dev server |
| `npm run build` / `npm run start` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Strict TypeScript |
| `npm run test` | Vitest unit tests (money, dates, schedule, status) |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push:unsafe` | **Dangerous** schema sync via Drizzle Kit (`push`). Can drop SQL-only objects like `investment_status_view`. Prefer migrations. |
| `npm run db:migrate` | Apply Drizzle migrations + `db/sql/*.sql` |
| `npm run db:seed` | Seed default data |

---

## 6. Key API Endpoints

Protected (owner only):

- `GET /api/dashboard/metrics?platformId=&mode=pro` — the nine canonical metrics + platform breakdown
- `GET /api/portfolio/export` — structured JSON for an AI advisor agent
- CRUD: `/api/platforms`, `/api/investments`, `/api/cashflows`, `/api/cash-transactions`, `/api/vision/targets`, `/api/settings`
- `POST /api/investments/preview-schedule` — preview cashflow schedule before saving
- `PATCH /api/cashflows/:id/receive` — atomic receipt
- `POST /api/snapshots` / `POST /api/snapshots/:id/restore`
- `POST /api/data-quality/scan`, `POST /api/alerts` (regenerate)
- `POST /api/import/preview`, `POST /api/import/commit`
- `GET/POST /api/share-links`, `DELETE /api/share-links/:id`

Public:

- `GET/POST /api/share/:token` — used only by the public share page

---

## 7. Deploy

- **Vercel** for the Next.js app (free hobby plan works).
- **Supabase** for Postgres + Auth.
- Set the same env vars from section 4.2 in the Vercel project settings.
- First-time deploy: run `npm run db:migrate` then `npm run db:seed` locally against the production `DATABASE_URL` (or from a trusted CI job with the same env vars).

### Vercel settings

- Framework preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Start Command (self-host fallback): `npm run start`

### Staging domain (`azhub.uk`)

If you use the root domain as staging, set:

- `NEXT_PUBLIC_BASE_URL=https://azhub.uk`
- Supabase Auth Site URL: `https://azhub.uk`
- Supabase Redirect URL: `https://azhub.uk/auth/callback`

Typical DNS records when attaching the domain to Vercel:

- Root domain `azhub.uk`: `A` record to `76.76.21.21`
- Optional `www.azhub.uk`: `CNAME` to `cname.vercel-dns.com`

If you later move staging to a subdomain, the common pattern is:

- `staging.azhub.uk` or `beta.azhub.uk`: `CNAME` to `cname.vercel-dns.com`

HTTPS is issued automatically by Vercel once the DNS resolves.

---

## 8. Testing

Unit tests live under `lib/finance/__tests__/`. They cover:
- Money rounding (including the `1.005` floating-point edge case)
- Smart date conversions (duration ↔ end date)
- Schedule generation for all six frequencies
- Status resolution (active / late / defaulted / completed)

Run with `npm run test`.

---

## 9. Roadmap (ideas, not scheduled)

- Playwright E2E smoke tests
- AI Advisor agent calling `/api/portfolio/export`
- Optional multi-user mode behind a feature flag
- Receipt OCR (ported from v1 when demand exists)
