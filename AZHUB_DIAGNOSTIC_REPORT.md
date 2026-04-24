# AZHUB_DIAGNOSTIC_REPORT.md
**A.Z Finance Hub v2 — Diagnostic Audit (v1, read-only pass)**

> Produced per the Diagnostic prompt. No code was modified in this pass.
> Binding reference: `AZHUB_V2_CONSTITUTION.md`. Non-binding mirror: `AZHUB_V2_DUSTUR_AR.md`.

---

## 1. Environment snapshot

### 1.1 Local env keys (presence vs `.env.example`)

| Key | Required by `.env.example` | Local `.env.local` | Notes |
|---|---|---|---|
| `PORT` | yes | present | `.env.local` line 1 |
| `NEXT_PUBLIC_BASE_URL` | yes | present | currently `http://localhost:3000` (local). MUST be `https://azhub.uk` on production. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | present | Supabase project ref `uopqmvfbvbzyjndltctl`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | present | publishable key family. |
| `DATABASE_URL` | yes | present | direct Postgres URL, `$` encoded as `%24`. |
| `OWNER_EMAIL` | yes | present | `ahmaaad277@gmail.com`. |
| `SHARE_LINK_SECRET` | yes | present but **still default** (`change-this-to-any-random-long-string-32-plus`) → acts as a **soft FAIL** on DEP-R-005 once share links are used. |

### 1.2 Vercel / `azhub.uk` deployment hypothesis

- `https://azhub.uk/` and `https://azhub.uk/api/health` returned **HTTP 502 Bad Gateway from Cloudflare** (earlier fetch evidence), with Cloudflare diagnostics showing `Host: Error`.
- This indicates: **Cloudflare is receiving requests, but the origin (Vercel) is not answering or is not connected to this hostname**.
- Likely causes (ordered by probability): (a) Vercel domain not attached to `azhub.uk`; (b) DNS points to Cloudflare with proxy but no correct Vercel origin; (c) Vercel deployment is failing build.
- Status: **NEEDS-HUMAN** — only the owner can inspect Vercel Domains and Cloudflare DNS/Proxy panels.

### 1.3 Supabase presence

- `NEXT_PUBLIC_SUPABASE_URL` present (host only, no `/table` path). PASS.
- `OWNER_EMAIL` present. PASS.
- `db/sql/investment_status_view.sql` applied successfully during the prior migrate step.
- 11 canonical tables verified present in `public` schema via `scripts/supabase-list-public-tables.mjs`.

---

## 2. Constitution conformance matrix

Statuses:
- **PASS** — verifiable conformance in code.
- **FAIL** — verifiable violation with file:line evidence.
- **UNKNOWN** — cannot be decided from code alone (needs runtime/dashboard).
- **NEEDS-HUMAN** — requires owner input (env/Supabase/Vercel/Cloudflare).

### 2.1 Financial integrity (FIN)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| FIN-R-001 | PASS | `lib/finance/metrics.ts:1-80`, `app/api/dashboard/metrics/route.ts:11-27` | Backend-only aggregation, client renders. |
| FIN-R-002 | PASS (with minor display exceptions) | `app/(app)/page.tsx:91-178` | Client uses `m?.xxx` fields only. Two `pct.toFixed(1)` display strings below. |
| FIN-R-003 | **PARTIAL / WARN** | `app/(app)/page.tsx:342`, `app/(app)/vision/page.tsx:93` | `toFixed(1)` used for **percentage display** (not money). Should route through a shared percent formatter (`formatPercent` from `lib/finance/money.ts`). |
| FIN-R-010 | PASS | `lib/finance/metrics.ts:1-52` | 9 canonical metrics frozen in the interface. |
| FIN-R-011 | PASS | `lib/finance/metrics.ts` comment *"STRICT — no fallback logic"* | No realized-gains fallbacks detected. |
| FIN-R-020 | PASS | `db/schema.ts:247-294` | `cash_transactions` is authoritative; no `current_balance` column anywhere. |
| FIN-R-021 | PASS | `db/schema.ts` scan | No `current_balance` column on any table. |
| FIN-R-022 | PASS | `app/api/cashflows/[id]/receive/route.ts:34-78` | Single `db.transaction(...)` wraps UPDATE + INSERT. |
| FIN-R-023 | PASS | `db/schema.ts:286-293` | `cash_tx_amount_sign_coherent` CHECK enforces sign discipline. |
| FIN-R-024 | PASS | (no code path disables CHECKs) | No `DROP CONSTRAINT cash_tx_*` found. |
| FIN-R-030 | PASS | `db/schema.ts` | No `status` column on `investments`. |
| FIN-R-031 | PASS | `db/sql/investment_status_view.sql:37` | 90-day split canonical. |
| FIN-R-032 | PASS (backend derives) | `lib/finance/status-resolver.ts`, `app/api/investments/route.ts:49-55` | Status derived server-side via resolver. |
| FIN-R-040 | PASS | `lib/finance/schedule-generator.ts`, `app/api/investments/preview-schedule/route.ts` | Client previews via API. |
| FIN-R-041 | PASS | `db/schema.ts:220` | `is_custom_schedule` present; no `custom_distributions` table. |
| FIN-R-042 | PASS | `lib/finance/schedule-generator.ts` | Principal row on `end_date`. |
| FIN F-table | **PARTIAL** | `app/api/investments/route.ts:62, 70-73` | Backend aggregates use `reduce((a,c)=>a+Number(c.amount),0)` without `sumMoney` — tolerable but not strict SSOT style. |

### 2.2 Database governance (DB)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| DB-R-001 | PASS | `db/schema.ts`, `db/migrations/0000_puzzling_echo.sql` | Migration accompanies schema. |
| DB-R-002 | PASS (by config + docs) | `package.json:13`, `README.md` §5 | `db:push:unsafe` is the only push script; docs state push forbidden in prod. |
| DB-R-003 | PASS | `db/sql/investment_status_view.sql`, `db/migrate.ts:26-33` | SQL views applied post-migrations. |
| DB-R-004 | **PARTIAL** | `db/schema.ts` has JSDoc comments but **no SQL `COMMENT ON`** calls | SQL-level comments for LLM introspection are not present in migrations. Downgrade to WARN. |
| DB-R-010 | PASS | `db/migrations/0000_puzzling_echo.sql` present & pristine | No evidence of post-merge edits. |
| DB-R-011 | UNKNOWN | no destructive migration yet | Policy applicable going forward. |
| DB-R-012 | UNKNOWN | no snapshots taken yet | Pre-destructive-migration snapshot policy not yet exercised. |
| DB-R-020 | PASS | `lib/supabase/client.ts:7-9` uses only `NEXT_PUBLIC_*`; `DATABASE_URL` not referenced in any `"use client"` file | Verified by grep. |
| DB-R-021 | PASS | `.gitignore` excludes `.env.local`; `.env.example` exists | Compliant. |
| DB-R-022 | UNKNOWN | Supabase RLS state is a dashboard setting | NEEDS-HUMAN. |
| DB-R-030 | UNKNOWN | no snapshot has been triggered yet | Procedural. |
| DB-R-040 | **WARN / OWNER DECISION** | `app/api/cashflows/[id]/receive/route.ts:96-102` | DELETE endpoint hard-deletes the ledger row (`tx.delete(cashTransactions)...`) on "undo receipt". This conflicts with **F4/F5** ("Ledger must be append-only"). Owner decision needed — either accept as an approved exception (document in `EXCEPTIONS.md`) or convert to a reversing entry (type=`withdrawal` with negative amount + `reference_id` pointing to the original). |
| DB-R-041 | PASS | `db/schema.ts:210` (`onDelete: "cascade"` investments→cashflows) | Matches rule; UX confirmation to be verified in investment delete UI. |
| DB-R-050 | PASS | `db/schema.ts` unique indexes present | All four canonical UQs present. |
| DB-R-051 | PASS | `db/schema.ts` | No parallel "distributions" table. |

### 2.3 Authentication & authorization (AUTH)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| AUTH-R-001 | PASS | `app/(auth)/login/page.tsx:24-29` | `signInWithOtp` (Magic Link) only. |
| AUTH-R-002 | PASS | 23 API routes contain `requireOwner()` (grep) | All non-public API protected. |
| AUTH-R-003 | PASS | `app/(app)/layout.tsx:11-14` | `getOwnerSession()` then redirect. |
| AUTH-R-004 | **FAIL (dev UX)** | `app/(app)/layout.tsx:12` — `if (!user && process.env.NODE_ENV === "production") redirect("/login");` | In **development** the guard is skipped, but the page still renders `AppSidebar`/`AppTopbar` which trigger protected fetches → 401 cascade and misleading toasts (UX-R-008). Staging on Vercel has `NODE_ENV=production` so it is guarded there. The rule explicitly demands **real-data environments** be guarded — owner must confirm local DB is not treated as "real data". |
| AUTH-R-005 | PASS | `middleware.ts:42` excludes `share/` and `api/share/`; `app/api/share/[token]/route.ts:73-76` forces `needsReview: true` | Compliant. |
| AUTH-R-006 | PASS | Only `signInWithOtp` in code | No second auth path. |
| AUTH-R-007 | NEEDS-HUMAN | Supabase Dashboard setting | Site URL + Redirect URLs must include local + `https://azhub.uk/auth/callback`. |
| AUTH-R-008 | UNKNOWN | procedural | N/A until owner rotation. |

### 2.4 Engineering (ENG)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| ENG-R-001 | PASS | `lib/finance/**`, `app/api/**` | Business logic server-side. |
| ENG-R-002 | PASS | no `import { db }` inside `"use client"` files | Verified by grep. |
| ENG-R-003 | PASS | React Query used in `app/(app)/page.tsx:63-83` | No Redux/Zustand/Jotai in `package.json`. |
| ENG-R-004 | PASS | `investmentInputSchema` in `lib/finance/investments-service.ts`; Zod used in routes | Validators present. |
| ENG-R-010 | PASS | No parallel `lib/dashboard/metrics.ts` or similar | Clean. |
| ENG-R-011 | N/A | procedural / PR-level | Enforce via `AGENTS.md`. |
| ENG-R-012 | PASS | no live-app import from `legacy_reference/` | `legacy_reference/**` is isolated. |
| ENG-R-020 | UNKNOWN | procedural | Enforce at PR review. |
| ENG-R-021 | PASS | `package.json` has one of each (React Query, React Hook Form, Zod, date-fns, drizzle-orm) | Compliant. |
| ENG-R-022 | PASS | `package.json` uses caret ranges; no `*` / `latest` | Compliant. |
| ENG-R-030 | UNKNOWN | `npm run typecheck` not executed this pass | Gate to run before merge. |
| ENG-R-031 | UNKNOWN | needs grep `@ts-ignore` inside `lib/finance`/`app/api` — not performed | Grep recommended in B1/B2. |
| ENG-R-040 | PASS | `app/api/health/route.ts` exists and is the only health endpoint | Compliant. |
| ENG-R-041 | PARTIAL | `lib/api.ts:15-29` returns `e.status ?? 500` | No mapping from `23505` (unique violation) → 409. Minor, acceptable. |

### 2.5 UX

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| UX-R-001 | UNKNOWN | not runtime-tested | needs manual check once B0 is done. |
| UX-R-002 | PASS | `components/investment-wizard.tsx`, `app/api/investments/preview-schedule/route.ts` | Wizard + live preview present. |
| UX-R-003 | PASS | grep — no duplicated pages | clean. |
| UX-R-004 | UNKNOWN | review step exists; modal confirmations to be audited page-by-page | TBD. |
| UX-R-005 | PASS | single `PATCH /api/cashflows/:id/receive` | Compliant. |
| UX-R-006 | UNKNOWN | visual check required on cashflow / wallet rows | TBD. |
| UX-R-007 | **WARN** | `components/app-sidebar.tsx:23-36` has 12 items | Missing explicit **Share Links** nav. If share management is inside Settings, it's fine (finite set). Owner decision: keep or add a top-level link. |
| UX-R-008 | **FAIL (partial)** | `lib/api.ts:28` returns `e.message ?? "Internal error"` | Generic fallback "Internal error" violates the spirit of the rule in edge cases. |
| UX-R-009 | PASS | `lib/i18n/dictionary.ts` present (translations exist) | No evidence of translating numbers. |
| UX-R-010 | PASS | `app/api/import/preview/route.ts` → `app/api/import/commit/route.ts` | Preview-before-commit present. |

### 2.6 Design (DESIGN)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| DESIGN-R-001 | PASS | `components/ui/*` shadcn primitives used throughout | Compliant. |
| DESIGN-R-002 | PASS | `package.json` — only shadcn/Radix | No second UI lib. |
| DESIGN-R-003 | UNKNOWN | needs visual audit per component | TBD B5. |
| DESIGN-R-004 | PASS | `db/schema.ts:333` — `theme` default `"dark"` | Dark-first preserved. |
| DESIGN-R-005 | PASS | i18n supports `"ar"` default (`db/schema.ts:334`) | RTL policy preserved. |
| DESIGN-R-006 | PASS | no emoji/stickers found in live components | clean. |
| DESIGN-R-007 | PASS | `db/schema.ts` `view_mode` enum + `app/(app)/page.tsx:59` `isLite` gating tiles | Compliant. |
| DESIGN-R-010 | PASS | `app/(app)/layout.tsx:15-23` shell preserved | Compliant. |
| DESIGN-R-011 | PASS | no page bypasses shell in `app/(app)/**` | clean. |
| DESIGN-R-012 | PASS | `components/metric-tile.tsx` used in `app/(app)/page.tsx` | Compliant. |
| DESIGN-R-020 | UNKNOWN | needs grep of `text-[` hardcoded sizes | TBD in B5. |
| DESIGN-R-021 | PASS | no new fonts in `app/layout.tsx` | Compliant. |
| DESIGN-R-030 | UNKNOWN | review per component | TBD B5. |
| DESIGN-R-031 | PASS | no parallax/carousel components | clean. |
| DESIGN-R-040..042 | UNKNOWN | runtime check required at 360px | TBD B5. |

### 2.7 Deployment (DEP)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| DEP-R-001 | UNKNOWN | procedural | Enforce via release process. |
| DEP-R-002 | PASS (docs) | `README.md` §5, §7 | Compliant in docs. |
| DEP-R-003 | UNKNOWN | procedural | No destructive migration yet. |
| DEP-R-004 | UNKNOWN | procedural | Rollback plan documented in constitution. |
| DEP-R-005 | **FAIL (likely)** | azhub.uk returns 502 → implies either missing env vars on Vercel or DNS/proxy mismatch | NEEDS-HUMAN in Vercel dashboard. |
| DEP-R-006 | UNKNOWN | procedural | N/A. |
| DEP-R-007 | NEEDS-HUMAN | Supabase Auth Site URL / Redirect URL | See AUTH-R-007. |

### 2.8 Testing (TEST)

| Rule ID | Status | Evidence | Notes |
|---|---|---|---|
| TEST-R-001..004 | PASS | `lib/finance/__tests__/*.test.ts` present (money, date, schedule, status) | Tests exist. |
| TEST-R-005 | UNKNOWN | not run in this pass | Gate before merge. |
| TEST-R-006 | UNKNOWN | not automated | Add snapshot test B2. |
| TEST-R-007 | UNKNOWN | visual | TBD B5. |
| TEST-R-008 | UNKNOWN | procedural | TBD. |

---

## 3. Feature inventory

### 3.1 App pages (`app/(app)/**`)

| Path | Auth Gate | State | Symptom if broken | Rule deps |
|---|---|---|---|---|
| `/` (dashboard) `app/(app)/page.tsx` | `getOwnerSession()` via layout | UNTESTED in prod (azhub.uk 502) | cascading 401 in local dev when no session | FIN-R-001, AUTH-R-003 |
| `/investments` `app/(app)/investments/page.tsx` | layout | UNTESTED | same | FIN-R-030..032 |
| `/cashflows` `app/(app)/cashflows/page.tsx` | layout | UNTESTED | same | FIN-R-022 |
| `/wallet` `app/(app)/wallet/page.tsx` | layout | UNTESTED | same | FIN-R-020..024 |
| `/platforms` `app/(app)/platforms/page.tsx` | layout | UNTESTED | — | DB-R-050 |
| `/vision` `app/(app)/vision/page.tsx` | layout | UNTESTED; `toFixed(1)` at :93 | — | FIN-R-003 |
| `/alerts` `app/(app)/alerts/page.tsx` | layout | UNTESTED | — | — |
| `/data-quality` `app/(app)/data-quality/page.tsx` | layout | UNTESTED | — | — |
| `/reports` `app/(app)/reports/page.tsx` | layout | UNTESTED | — | — |
| `/snapshots` `app/(app)/snapshots/page.tsx` | layout | UNTESTED | — | DB-R-030, DEP-R-004 |
| `/import` `app/(app)/import/page.tsx` | layout | UNTESTED | — | UX-R-010 |
| `/settings` `app/(app)/settings/page.tsx` | layout | UNTESTED | — | — |
| `/login` `app/(auth)/login/page.tsx` | public | UNREACHABLE in prod (azhub.uk 502) | 502 from Cloudflare | AUTH-R-001 |
| `/auth/callback` | public | UNREACHABLE in prod | 502 | AUTH-R-007 |
| `/share/[token]` | public (token-gated) | UNTESTED | — | AUTH-R-005 |
| `/offline` | public | UNTESTED | — | — |

### 3.2 API routes (`app/api/**`)

| Path | Methods | Gate | State | Rule deps |
|---|---|---|---|---|
| `/api/health` | GET | public | WORKS locally (returns flags); UNREACHABLE on azhub.uk | DEP-R-005 |
| `/api/dashboard/metrics` | GET | requireOwner | WORKS with session | FIN-R-001 |
| `/api/investments` | GET, POST | requireOwner | WORKS; **minor FIN-R-003 concern** at :62, 70 | FIN-R-011 |
| `/api/investments/[id]` | GET, PATCH, DELETE | requireOwner | UNTESTED | FIN-R-030 |
| `/api/investments/preview-schedule` | POST | requireOwner | PASS | FIN-R-040 |
| `/api/cashflows` | GET | requireOwner | WORKS | — |
| `/api/cashflows/[id]/receive` | PATCH, DELETE | requireOwner | PASS atomic on PATCH; **DELETE hard-deletes ledger** → DB-R-040 decision needed | FIN-R-022 |
| `/api/cash-transactions` | GET, POST | requireOwner | UNTESTED | FIN-R-023 |
| `/api/cash-transactions/[id]` | — | requireOwner | UNTESTED | — |
| `/api/platforms`, `/api/platforms/[id]` | CRUD | requireOwner | UNTESTED | DB-R-050 |
| `/api/vision/targets` | CRUD | requireOwner | UNTESTED | DB-R-050 |
| `/api/alerts`, `/api/alerts/[id]` | CRUD | requireOwner | UNTESTED | — |
| `/api/data-quality/scan` | POST | requireOwner | UNTESTED | — |
| `/api/snapshots`, `/api/snapshots/[id]`, `/api/snapshots/[id]/restore` | — | requireOwner | UNTESTED | DB-R-030 |
| `/api/import/preview`, `/api/import/commit` | POST | requireOwner | UNTESTED | UX-R-010 |
| `/api/share-links`, `/api/share-links/[id]` | CRUD | requireOwner | UNTESTED | AUTH-R-005 |
| `/api/share/[token]` | GET, POST | public (token) | UNTESTED; forces `needsReview=true` PASS | AUTH-R-005 |
| `/api/settings` | GET, PATCH | requireOwner | UNTESTED | — |
| `/api/portfolio/export` | GET | requireOwner | UNTESTED | — |

---

## 4. Error taxonomy

| Symptom | Class | Probable root cause | Code pointer | Rule ID | Confidence |
|---|---|---|---|---|---|
| `azhub.uk` returns 502 Bad Gateway | Network / domain | Vercel origin not attached to `azhub.uk`, or Cloudflare proxy routing to wrong origin | Vercel/Cloudflare dashboards | DEP-R-005, DEP-R-007 | HIGH |
| Magic Link email points to localhost in production | Supabase auth | `NEXT_PUBLIC_BASE_URL` in Vercel env not updated, or Supabase Site URL still `http://localhost:3000` | `app/(auth)/login/page.tsx:27` uses `window.location.origin` | AUTH-R-007 | HIGH |
| "Not Authorized" cascade in dashboard in dev | Supabase auth + UX | Layout allows unauthenticated render in dev (`app/(app)/layout.tsx:12`), but every inner client fetch hits `requireOwner()` → 401 toasts | `app/(app)/layout.tsx:12`, `lib/api.ts:28` | AUTH-R-004, UX-R-008 | HIGH |
| "Invalid share link" 404 on `/share/...` | API | Token expired / revoked | `app/api/share/[token]/route.ts:30-34` | AUTH-R-005 | MED |
| "Validation error" 422 on POST | API | Zod rejection | `lib/api.ts:22-24` | ENG-R-004 | MED |
| CHECK constraint violation on cash tx | DB | Wrong sign (e.g. negative deposit) | `db/schema.ts:286-293` | FIN-R-023 | MED |
| Drizzle push drop of `investment_status_view` | DB | Someone ran `db:push:unsafe` against same DB after view was applied | `drizzle.config.ts` / `db/sql/investment_status_view.sql` | DB-R-002 | HIGH (already observed) |
| Generic "Internal error" toast | UX | `lib/api.ts:28` fallback string | `lib/api.ts:28` | UX-R-008 | HIGH |
| PWA offline page flash on slow network | Runtime | Service worker cache | `public/sw.js`, `app/offline/page.tsx` | — | LOW |

---

## 5. Blast-radius graph (top 5)

| Rank | Problem | Unblocks | Severity | Effort |
|---|---|---|---|---|
| 1 | **`azhub.uk` returns 502 (Vercel/Cloudflare)** | Every page, every API, every Auth test end-to-end | DEP / AUTH | S–M (dashboard config, not code) |
| 2 | **Supabase Auth Site URL + Redirect URLs not confirmed for local + staging + prod** | All Magic Link flows | AUTH | S |
| 3 | **Vercel environment variables parity with `.env.example`** (esp. `NEXT_PUBLIC_BASE_URL=https://azhub.uk`, rotated `SHARE_LINK_SECRET`, `OWNER_EMAIL`) | `/api/health` flags green, login works, share links secure | DEP / AUTH | S |
| 4 | **Dev-mode auth UX cascade** (`app/(app)/layout.tsx:12`) + generic "Internal error" fallback (`lib/api.ts:28`) | Local developer experience; reduces noise while debugging other batches | AUTH / UX | M |
| 5 | **`DELETE /api/cashflows/[id]/receive` hard-deletes ledger row** (§ DB-R-040) | Preserves audit trail once enforced | FIN / DB | S (small code change, needs owner decision) |

---

## 6. Triage plan (batches)

### B0 — Foundation: domain + env + auth wiring *(owner approval: Y)*
- **Unblock reason:** Everything downstream requires a reachable, authenticated app.
- **Rule IDs touched:** DEP-R-005, DEP-R-007, AUTH-R-007.
- **Verification gate:**
  - `curl -sSf https://azhub.uk/api/health` → `200` with `databaseConfigured`, `supabaseConfigured`, `ownerConfigured` all `true`.
  - Magic Link email from `https://azhub.uk/login` arrives and redirects to `/` after exchange.
  - `curl https://azhub.uk/api/dashboard/metrics` without session → `401` (not 500, not 200).

### B1 — Data integrity finalization *(owner approval: Y for any DB change)*
- **Unblock reason:** Lock Drizzle vs live Supabase; add SQL COMMENTS (DB-R-004); confirm view exists.
- **Rule IDs:** DB-R-001..004, DB-R-030.
- **Verification gate:**
  - `node scripts/supabase-list-public-tables.mjs` → 11 tables.
  - Query `select count(*) from investment_status_view;` works.
  - `COMMENT ON COLUMN …` present on key tables (alerts/cashflows/cash_transactions/investments).

### B2 — Core product spine *(owner approval: Y — touches wizard + metrics + atomic receipt)*
- **Scope:** dashboard metrics parity test, investment wizard end-to-end, atomic cashflow receipt, wallet ledger.
- **Rule IDs:** FIN-R-001..042, UX-R-002, UX-R-005.
- **Verification gate:**
  - Create investment → 9 metrics render → mark 1 cashflow received → cash balance increases by exactly the received amount.
  - Undo receipt (after owner decision on DB-R-040) → balance decreases by the same amount.
  - Vitest `lib/finance/__tests__/*` all green.

### B3 — Operational features *(owner approval: batch-level, per feature)*
- **Scope:** platforms CRUD, alerts auto-generation, data-quality scan, settings.
- **Rule IDs:** DB-R-050, UX-R-008, UX-R-009.
- **Verification gate:** Each page loads with seeded data, each mutation emits a single actionable toast.

### B4 — Auxiliary features *(owner approval: batch-level)*
- **Scope:** vision targets, reports export (PDF/Excel/JSON), snapshots (backup + restore), CSV/XLSX import (preview→commit), share links.
- **Rule IDs:** DB-R-030, UX-R-010, AUTH-R-005.
- **Verification gate:** snapshot → destructive op → restore returns state; import preview rejects bad row before commit.

### B5 — Polish layer *(owner approval: N for pure polish; Y for design changes)*
- **Scope:** i18n AR/EN parity, RTL, Pro/Lite toggle, PWA/offline, mobile 360 px regression, percent formatting unified (`formatPercent` replaces stray `toFixed`).
- **Rule IDs:** DESIGN-R-005, DESIGN-R-040..042, FIN-R-003.
- **Verification gate:** every page renders at 360 px without horizontal scroll, AR+EN identical semantics, `rg "\.toFixed\(" app/ components/ lib/` returns 0 results in non-test code.

---

## 7. Known unknowns (need runtime / dashboard access)

1. Vercel project attachment to `azhub.uk` and current deployment build status.
2. Cloudflare DNS records for `azhub.uk` and proxy (orange cloud) state.
3. Vercel Environment Variables for **Preview** vs **Production** — whether `NEXT_PUBLIC_BASE_URL` is `https://azhub.uk` in production.
4. Supabase → Authentication → URL Configuration (Site URL, Redirect URLs).
5. Supabase Auth email template branding (optional).
6. Whether `OWNER_EMAIL` on Vercel exactly matches the email that receives the Magic Link. `lib/auth.ts:15-17` does `.toLowerCase()` comparison, but **empty env** would silently allow any email.
7. Whether Supabase RLS is enabled for `public` tables (currently **no**; route-level `requireOwner()` is the only gate).
8. Runtime output of `npm run lint && npm run typecheck && npm run test` on current HEAD.
9. Visual/UX audit at 360 px width across all 12 nav pages.
10. Whether the current `SHARE_LINK_SECRET` default has been used to issue any share link (if yes, **rotate then invalidate links**).

---

### Findings summary — what to fix first

1. **B0**: make `https://azhub.uk` return a real response (502 root cause) — then fix Supabase Site URL + Redirect URLs for local / staging / prod.
2. **B0.5**: set `NEXT_PUBLIC_BASE_URL=https://azhub.uk` and rotate `SHARE_LINK_SECRET` in Vercel.
3. **B1**: add `COMMENT ON` for core columns (DB-R-004 PARTIAL → PASS).
4. **B2**: owner decision on **DB-R-040** (`DELETE /api/cashflows/[id]/receive` hard-deleting ledger) — either accept as exception (`EXCEPTIONS.md`) or convert to reversing entry.
5. **B2**: replace `Number(c.amount)` reduces in `app/api/investments/route.ts:62, 70-73` with `sumMoney()` for strict FIN-R-003.
6. **B5**: replace `pct.toFixed(1)` in `app/(app)/page.tsx:342` and `app/(app)/vision/page.tsx:93` with `formatPercent(pct, 1)` for FIN-R-003 consistency.
7. **B5/UX**: improve `lib/api.ts:28` fallback from `"Internal error"` to include at least route context (keeps UX-R-008 honest while not leaking internals).

---

*End of AZHUB_DIAGNOSTIC_REPORT.md (v1). Produced read-only.*
