# AZHUB_V2_CONSTITUTION.md
**A.Z Finance Hub v2 — Operational Constitution**

---

## 0. Document Metadata

| Field | Value |
|---|---|
| Version | 1.0.2 |
| Effective date | On merge to `main` |
| Owner | Single owner defined by `OWNER_EMAIL` |
| Scope | Entire repository, all branches, all environments (local / staging / production) |
| Supersedes | All prior ad-hoc guidance, inline comments, and agent instructions |
| Change control | See §12. Rules MAY only be changed by an explicit owner-signed PR that updates this file AND increments its version |
| Audience | Human contributors AND all AI agents (Claude / GPT / Cursor / Copilot / any future model) |

This document is the **single source of truth for conduct**. When any other
document (README, chat, issue, comment) conflicts with this file, **this file wins**.

---

## 1. Core Product Mission & Non-Goals

### 1.1 Mission
A.Z Finance Hub v2 is a **single-owner, private, fixed-income and sukuk portfolio command center**. Its purpose is to give the owner an **auditable, mathematically correct, friction-free** view of:

- Active principal and cash balance
- Realized vs. expected profit
- Maturity schedule and overdue risk
- Vision-2040 goal progression

### 1.2 Primary User
One natural person — the owner — identified by `OWNER_EMAIL`. Other humans may only interact with the system via **time-limited share links** for data entry, never for reading portfolio state.

### 1.3 What the app MUST optimize for
1. **Financial correctness** over everything else.
2. **Auditability** of every monetary change.
3. **Clarity** — one screen, one decision.
4. **Speed of entry** — adding an investment must feel faster than a spreadsheet.

### 1.4 What the app MUST NOT become
- A multi-tenant SaaS
- A social/collaboration product
- A trading/execution platform (no orders, no brokers)
- A document/OCR workflow engine
- A "dashboard of dashboards" (feature bloat)
- A generic bookkeeping tool

### 1.5 Rules
- **PROD-R-001 (MUST)** Every feature request must be answered first with: *"Does this serve a single owner managing fixed-income investments?"*. If no → reject.
- **PROD-R-002 (MUST NOT)** Introduce any concept of multiple portfolios per user without an explicit amendment to §10 of this document.
- **PROD-R-003 (MUST)** Retain the 9 canonical dashboard metrics (see §4.2) as the center of gravity of the product.

---

## 2. Design System — Immutable Rules

The current visual identity, spacing, typography, and shadcn/ui component usage are **ratified as-is**. Changes require an owner-approved design exception (§12).

### 2.1 Visual identity
- **DESIGN-R-001 (MUST)** Use only the existing Tailwind theme tokens and shadcn/ui primitives in `components/ui/*`.
- **DESIGN-R-002 (MUST NOT)** Introduce a second UI library (MUI, Chakra, Mantine, Ant, etc.).
- **DESIGN-R-003 (MUST NOT)** Hand-roll a component whose behavior already exists in `components/ui/*` (e.g. do not create a custom `Dialog` when `components/ui/dialog.tsx` exists).
- **DESIGN-R-004 (MUST)** Preserve the dark-first aesthetic. Light theme is supported via `theme` setting but is **never** the default.
- **DESIGN-R-005 (MUST)** Preserve RTL behavior for Arabic. Any new component must render correctly with `dir="rtl"`.
- **DESIGN-R-006 (MUST NOT)** Add decorative illustrations, emoji, stickers, confetti, or gradients that are not already present in the repo.
- **DESIGN-R-007 (MUST)** Keep the Pro vs Lite view mode distinction. Lite hides advanced metrics; Pro shows all 9.

### 2.2 Layout & spacing
- **DESIGN-R-010 (MUST)** All app pages render inside the `(app)/layout.tsx` shell: `AppSidebar` + `AppTopbar` + `<main className="container ...">`.
- **DESIGN-R-011 (MUST NOT)** Bypass the sidebar/topbar shell for authenticated pages.
- **DESIGN-R-012 (MUST)** Keep dashboard tile grid behavior from `components/metric-tile.tsx` — no custom metric tiles elsewhere.

### 2.3 Typography
- **DESIGN-R-020 (MUST)** Use existing font-size tokens (`small / medium / large` from `font_size` enum) — never hard-code `text-[13px]` etc.
- **DESIGN-R-021 (MUST NOT)** Add a new font family.

### 2.4 Motion
- **DESIGN-R-030 (MUST)** Animations are subtle and short (< 300ms). Framer Motion is allowed only for existing motion patterns; do not introduce new choreography without a design exception.
- **DESIGN-R-031 (MUST NOT)** Add parallax, auto-playing carousels, or marketing-style entrance animations.

### 2.5 Mobile & tablet
- **DESIGN-R-040 (MUST)** Every page MUST be usable at 360 px width.
- **DESIGN-R-041 (MUST)** Touch targets ≥ 40 px.
- **DESIGN-R-042 (MUST NOT)** Introduce horizontal scrolling on any page except an explicit data table.

### 2.6 Forbidden Design Changes (cannot ship without owner approval)

| # | Change | Why it is forbidden |
|---|---|---|
| D1 | Renaming, restyling, or reordering the 9 dashboard metrics | Breaks user mental model + any saved dashboards |
| D2 | Replacing shadcn/ui primitives with custom ones | Inconsistent spacing, focus rings, a11y regressions |
| D3 | Adding a new top-level nav item | Sidebar is a ratified information architecture |
| D4 | Adding a second theme palette | Theme tokens are canonical |
| D5 | Shipping a marketing/landing page inside the app shell | App is private, not public |
| D6 | Adding avatars / social elements | Single-owner system |
| D7 | Auto-opening modals on page load | UX friction |
| D8 | Toast storms (> 1 toast per user action) | Violates signal-to-noise |
| D9 | Introducing a new chart library besides Recharts | Visual drift |
| D10 | Changing the investment wizard from a linear flow to tabs | Ratified flow in `components/investment-wizard.tsx` |

---

## 3. UX — Immutable Rules

- **UX-R-001 (MUST)** Creating an investment from the dashboard MUST be ≤ **3 clicks** from `/` to an open wizard, AND ≤ **6 field interactions** to a valid submit when using defaults.
- **UX-R-002 (MUST)** The wizard MUST retain its smart date toggle (**duration ↔ end date**) and its live schedule preview via `POST /api/investments/preview-schedule`.
- **UX-R-003 (MUST NOT)** Duplicate any screen that already exists. If a feature needs a variant, gate it behind the existing Pro/Lite toggle.
- **UX-R-004 (MUST)** Every monetary action that mutates state MUST surface a confirmation (either inline Review step or a modal) — **no silent writes**.
- **UX-R-005 (MUST)** Cashflow receipt is a one-click atomic action via `PATCH /api/cashflows/:id/receive`. It MUST NOT be split across two steps.
- **UX-R-006 (MUST NOT)** Hide financial actions behind overflow menus (`…`) when they mutate money. Money mutations are first-class buttons.
- **UX-R-007 (MUST)** Navigation destinations are finite: Dashboard, Investments, Cashflows, Wallet, Platforms, Vision, Alerts, Data Quality, Reports, Snapshots, Import, Settings, Share Links. **No new top-level destinations** without a charter amendment.
- **UX-R-008 (MUST)** Errors MUST be actionable (tell the user exactly which field, which row). Generic `"Something went wrong"` toasts are a bug.
- **UX-R-009 (MUST)** AR and EN outputs MUST be semantically equivalent. Never translate a number (e.g. `30d` stays `30d`; only labels translate).
- **UX-R-010 (MUST NOT)** Introduce a second import path besides `POST /api/import/preview` → `POST /api/import/commit`. Preview-before-commit is mandatory.

---

## 4. Financial Integrity Rules

This is the highest-severity section. Violations here are automatically release-blocking.

### 4.1 Single Source of Truth
- **FIN-R-001 (MUST)** All monetary aggregations live in `lib/finance/metrics.ts`. The frontend calls `GET /api/dashboard/metrics` and **renders**. It does not aggregate.
- **FIN-R-002 (MUST NOT)** Aggregate, sum, or derive any portfolio-level number in client code, hooks, or components.
- **FIN-R-003 (MUST)** All money rounding goes through `roundToMoney` / `sumMoney` / `splitMoneyEvenly` / `parseMoney` / `formatMoney` in `lib/finance/money.ts`. Never use raw `Math.round`, `toFixed`, or `Number(x).toFixed(2)` for money.

### 4.2 The 9 canonical metrics (frozen contract)

| # | Metric | Definition |
|---|---|---|
| 1 | Total Cash Balance | `SUM(cash_transactions.amount)` |
| 2 | Active Principal | `SUM(principal_amount)` where `derived_status ∈ {active, late}` |
| 3 | NAV | Active Principal + Cash Balance |
| 4 | Cash Drag % | Cash / NAV × 100 |
| 5 | Realized Gains | `SUM(cashflows.amount)` where `type='profit' AND status='received'` — **strict**, no fallbacks |
| 6 | Expected Inflow | pending cashflows bucketed at 30 / 60 / 90 days |
| 7 | WAM (days) | `Σ(principal × days_to_maturity) / Σ(principal)` |
| 8 | Default Rate % | `Σ(principal where overdue>90d) / NAV × 100` |
| 9 | Active Annual Yield % | `Σ(expected_profit) / Active Principal × (365 / WAM_days)` |

- **FIN-R-010 (MUST NOT)** Add, rename, or redefine any of the 9 metrics without (a) a versioned deprecation, (b) a Vitest suite update, (c) an owner-signed PR.
- **FIN-R-011 (MUST NOT)** Introduce fallback calculations (e.g. *"if realized gains is null, use expected profit"*). **Realized means realized.**

### 4.3 Double-entry ledger
- **FIN-R-020 (MUST)** `cash_transactions` is the authoritative cash ledger. Cash balance is **always** `SUM(amount)`.
- **FIN-R-021 (MUST NOT)** Introduce a `current_balance` column on any table.
- **FIN-R-022 (MUST)** Every cashflow receipt inserts exactly one `cash_transactions` row of `type='cashflow_receipt'` inside the same DB transaction that sets `cashflows.status='received'`.
- **FIN-R-023 (MUST)** Sign discipline (enforced by DB CHECK constraints):
  - `deposit`, `cashflow_receipt` → amount > 0
  - `withdrawal`, `investment_funding` → amount < 0
- **FIN-R-024 (MUST NOT)** Disable, drop, or weaken any `cash_tx_*` CHECK constraint.

### 4.4 Status integrity
- **FIN-R-030 (MUST NOT)** Add a `status` column to `investments`. Status is derived via `investment_status_view`.
- **FIN-R-031 (MUST)** The late / defaulted split at 90 days is canonical.
- **FIN-R-032 (MUST NOT)** Compute status in the frontend.

### 4.5 Schedule & maturity integrity
- **FIN-R-040 (MUST)** Automatic schedules use `lib/finance/schedule-generator.ts`. The frontend previews via the API — it does not regenerate.
- **FIN-R-041 (MUST)** Custom schedules live in the same `cashflows` table with `is_custom_schedule=true`. **The legacy `custom_distributions` concept MUST NOT return.**
- **FIN-R-042 (MUST)** Principal return rows have `type='principal'` and `due_date = end_date`. This relationship is immutable.

### 4.6 Forbidden Financial Mistakes

| # | Mistake | Why forbidden |
|---|---|---|
| F1 | Summing cashflows in a React component | Bypasses SSOT |
| F2 | Using `Number.toFixed(2)` for money | Causes half-to-even drift |
| F3 | Marking a cashflow received without a ledger entry | Breaks double-entry invariant |
| F4 | Deleting a cashflow that has a matching ledger entry | Creates orphan credits |
| F5 | Editing `cash_transactions` rows in place | Ledger must be append-only except for `notes` |
| F6 | Adding a fallback when realized gains is 0 | Obscures reality |
| F7 | Storing investment status | Contradicts computed-status contract |
| F8 | Rounding at display time only | Sum(display) ≠ SUM(db) |
| F9 | Mixing currencies | App is SAR-only unless §10 is amended |
| F10 | Changing WAM weighting from principal to NAV | Different metric, different meaning |
| F11 | Auto-committing imports | Preview-before-commit is mandatory |
| F12 | Allowing `needsReview` rows into aggregations before approval | Pollutes SSOT |

---

## 5. Database Governance

### 5.1 Schema & migrations
- **DB-R-001 (MUST)** `db/schema.ts` is the Drizzle source of truth. Every change MUST be accompanied by a migration file in `db/migrations/`.
- **DB-R-002 (MUST NOT)** Run `drizzle-kit push` against staging or production. `db:push:unsafe` exists only for local experimentation. It can drop SQL-only objects (e.g. `investment_status_view`).
- **DB-R-003 (MUST)** SQL-only objects (views, policies, triggers) live under `db/sql/` and are applied by `db/migrate.ts` AFTER Drizzle migrations.
- **DB-R-004 (MUST)** Every new column MUST carry a SQL `COMMENT` so future LLMs can safely introspect.

### 5.2 Migration hygiene
- **DB-R-010 (MUST)** Migrations are append-only. A committed migration MUST NOT be edited after merge.
- **DB-R-011 (MUST)** Destructive migrations (DROP, column removal, type narrowing) require a **two-PR** policy: PR1 deprecates in code; PR2 drops at the DB layer.
- **DB-R-012 (MUST)** Every destructive migration MUST be preceded by a snapshot (see §5.4).

### 5.3 RLS & secret hygiene
- **DB-R-020 (MUST)** `DATABASE_URL` is server-only. It MUST NOT appear in any file under `app/**` that is marked `"use client"`.
- **DB-R-021 (MUST NOT)** Commit real credentials. `.env.local` is git-ignored. `.env.example` is the public template.
- **DB-R-022 (SHOULD)** Enable Supabase RLS with owner-only policies once multi-client SDK use is considered. Until then, server-side `requireOwner()` is the gate.

### 5.4 Backup & restore
- **DB-R-030 (MUST)** `portfolio_snapshots` is the in-app backup channel. Before any destructive migration, a snapshot MUST be taken.
- **DB-R-031 (MUST)** Snapshot restore is the authoritative rollback path for data (not manual SQL patching).

### 5.5 Deletion
- **DB-R-040 (MUST NOT)** Hard-delete any `cash_transactions` row that is referenced by a `cashflows` receipt. Use reversing entries.
- **DB-R-041 (MUST)** `investments` deletion cascades to `cashflows` (DB-level) — this is by design; UX MUST require a confirmation with the number of cashflows that will cascade.

### 5.6 Duplication prevention
- **DB-R-050 (MUST)** Unique indexes are canonical: `platforms_name_uq`, `share_links_token_uq`, `vision_targets_month_uq`, `alerts_dedupe_uq`. They MUST NOT be relaxed.
- **DB-R-051 (MUST NOT)** Add parallel tables with overlapping meaning (e.g. a second "distributions" table). Use the existing `cashflows.is_custom_schedule` flag.

---

## 6. Authentication & Authorization Rules

- **AUTH-R-001 (MUST)** The only sign-in path is Supabase **owner-only password auth** for `OWNER_EMAIL`. The UI MAY present this as a numeric `PIN`, but the underlying auth provider remains Supabase Auth.
- **AUTH-R-002 (MUST)** Every protected API route calls `requireOwner()` before any DB work.
- **AUTH-R-003 (MUST)** Every protected page checks `getOwnerSession()` server-side.
- **AUTH-R-004 (MUST NOT)** Skip auth in any environment where real data exists (staging included). The current dev-only bypass in `app/(app)/layout.tsx` is tolerated **only for `NODE_ENV=development`**. Staging and production MUST be guarded.
- **AUTH-R-005 (MUST)** Share-link endpoints (`/api/share/:token`) are the only public data-write paths; they MUST only accept investment submissions flagged `needsReview=true`.
- **AUTH-R-006 (MUST NOT)** Introduce a second auth method (Magic Link, OAuth, SSO, biometrics, passkeys, local-only PIN stores) without an amendment to §10.
- **AUTH-R-007 (MUST)** Supabase Auth redirect URLs MUST list exactly the local origin, staging origin (`https://azhub.uk/auth/callback`), and production origin for password recovery and authenticated callback flows. No wildcards.
- **AUTH-R-008 (MUST)** If `OWNER_EMAIL` is rotated, all live sessions are invalidated and the owner credential must be reset. Document this in the owner's recovery notes.

---

## 7. Engineering Rules

### 7.1 Architecture
- **ENG-R-001 (MUST)** Business logic lives on the server: `app/api/*` routes and `lib/finance/*`. Client components are view + input only.
- **ENG-R-002 (MUST NOT)** Call the database from client components.
- **ENG-R-003 (MUST)** Use React Query for server-state on the client. Do not introduce Redux/Zustand/Jotai for data already cached by React Query.
- **ENG-R-004 (MUST)** Use Zod schemas (`drizzle-zod`) for every API request body. Reject non-conforming payloads with 400.

### 7.2 File & module discipline
- **ENG-R-010 (MUST NOT)** Create parallel files for the same responsibility (e.g. `lib/finance/metrics.ts` AND `lib/dashboard/metrics.ts`).
- **ENG-R-011 (MUST)** When modifying a file, do not touch unrelated files. A PR that touches > 10 files for a one-feature change MUST be rejected unless the owner pre-approved it.
- **ENG-R-012 (MUST NOT)** Leave dead legacy imports referencing `legacy_reference/`. That folder is **reference only** and MUST NOT be imported from the live app.

### 7.3 Dependencies
- **ENG-R-020 (MUST NOT)** Add a new npm dependency without justification in the PR body. A dependency is justified only if it (a) removes ≥ 100 LOC of hand-rolled code, (b) has ≥ 1M weekly downloads, and (c) has a compatible license.
- **ENG-R-021 (MUST NOT)** Add a second state/form/query/date/money library. One of each is already chosen.
- **ENG-R-022 (MUST)** Pin versions in `package.json` — no `latest`, no `*`.

### 7.4 TypeScript
- **ENG-R-030 (MUST)** `npm run typecheck` is green before any merge.
- **ENG-R-031 (MUST NOT)** Use `any`, `as unknown as`, or `@ts-ignore` to silence compiler errors inside `lib/finance/*` or `app/api/*`. Everywhere else requires a comment.

### 7.5 Observability
- **ENG-R-040 (MUST)** `app/api/health/route.ts` is authoritative for liveness and env presence. Do not introduce parallel health endpoints.
- **ENG-R-041 (SHOULD)** Surface PostgreSQL constraint violations as 409 with the constraint name; never leak stack traces to the UI.

---

## 8. Testing Requirements

- **TEST-R-001 (MUST)** Every change to `lib/finance/*` MUST include or update a Vitest test in `lib/finance/__tests__/`.
- **TEST-R-002 (MUST)** The 1.005 money-rounding edge case (`roundToMoney`) MUST remain green.
- **TEST-R-003 (MUST)** Schedule generator MUST be tested for all six frequencies: `monthly / quarterly / semi_annually / annually / at_maturity / custom`.
- **TEST-R-004 (MUST)** Status resolver MUST be tested for `active / late / defaulted / completed`.
- **TEST-R-005 (MUST)** No feature ships if `npm run lint`, `npm run typecheck`, or `npm run test` is red.
- **TEST-R-006 (SHOULD)** Before merging a dashboard change, verify parity between `/api/dashboard/metrics` and `lib/finance/metrics.ts` by snapshot.
- **TEST-R-007 (MUST)** Mobile regression check: dashboard + investments + wizard at 360 px width.
- **TEST-R-008 (MUST)** A change that touches an API route MUST be validated against a known seed (run `npm run db:seed` locally) and re-tested.

---

## 9. Deployment Rules

- **DEP-R-001 (MUST)** Promotion order: **local → staging (`azhub.uk` or its subdomain) → production**. No direct-to-prod.
- **DEP-R-002 (MUST)** DB migrations are applied via `npm run db:migrate` using the target `DATABASE_URL`. `drizzle-kit push` is not a deploy step.
- **DEP-R-003 (MUST)** Before a destructive migration reaches production, a `portfolio_snapshots` row MUST exist for that day.
- **DEP-R-004 (MUST)** Rollback strategy:
  1. Revert the Vercel deployment.
  2. If DB is involved, apply a reversing migration (never edit history).
  3. If data is involved, restore a `portfolio_snapshots` row.
- **DEP-R-005 (MUST)** Environment variables in Vercel MUST match `.env.example` keys exactly. Missing variables cause `/api/health` to fail — that is the gate.
- **DEP-R-006 (MUST NOT)** Hot-patch production by SSH / Supabase SQL editor except during an incident, and any such patch MUST be followed by a permanent migration within 24 hours.
- **DEP-R-007 (MUST)** Auth redirect URLs and Site URL in Supabase MUST be kept in sync with every new environment (local, staging, prod).

---

## 10. Scalability Rules (what MAY evolve; what MUST stay simple)

Future expansions that ARE permitted **with an amendment**:
- Multi-user mode behind a feature flag, with Supabase RLS per user.
- AI Advisor agent consuming `GET /api/portfolio/export`.
- External data feeds (e.g. sukuk price APIs) as **read-only enrichers** of existing entities.
- Automation hooks (e.g. auto-mark cashflow received on bank webhook) — only via the existing `cashflows` receipt transaction.

Future expansions that are **explicitly forbidden** without a charter amendment:
- **SCALE-R-001 (MUST NOT)** Add a payments/execution feature (orders, brokers, wires).
- **SCALE-R-002 (MUST NOT)** Add a social feature (comments, sharing, public profiles).
- **SCALE-R-003 (MUST NOT)** Add a generic report builder. Reports are a fixed set.
- **SCALE-R-004 (MUST NOT)** Introduce a microservice. The app is intentionally a single Next.js process on Vercel.
- **SCALE-R-005 (MUST NOT)** Introduce a queue/broker (Kafka, RabbitMQ, Redis Streams). Use Postgres and Vercel Cron.

---

## 11. AI Agent Operating Protocol

This section binds every AI agent (Claude, GPT, Cursor Agent, Copilot, future models) that operates on this repo.

- **AI-R-001 (MUST)** Before planning, answering, or editing any file, read this document end-to-end.
- **AI-R-002 (MUST)** Before any change that touches `lib/finance/*`, `db/schema.ts`, `db/migrations/*`, `db/sql/*`, `app/api/**`, or `components/investment-wizard.tsx`, the agent MUST:
  1. State which rule IDs are impacted.
  2. Ask the owner for explicit approval.
  3. Produce a test plan.
- **AI-R-003 (MUST NOT)** "Improve" code that is not part of the requested task.
- **AI-R-004 (MUST NOT)** Invent a feature that was not explicitly requested.
- **AI-R-005 (MUST NOT)** Upgrade dependencies as a side effect of another task.
- **AI-R-006 (MUST NOT)** Rewrite the SSOT math for "clarity". Clarity is an owner-signed PR, not an agent decision.
- **AI-R-007 (MUST)** When blocked by a rule, the agent MUST stop and surface the rule ID. It MUST NOT route around the rule by creating parallel files or flags.
- **AI-R-008 (MUST)** Any agent output that modifies more than 10 files for a single feature MUST be rejected by the reviewer unless pre-approved.
- **AI-R-009 (MUST NOT)** Assume defaults for environment variables. If a required env is missing, fail loudly.
- **AI-R-010 (MUST)** Treat `legacy_reference/` as read-only archaeology. Do not import from it. Do not copy code out of it without owner review.
- **AI-R-017 (MUST)** Unless the user explicitly asks for deep technical detail, explain problems, plans, risks, and decisions in simple direct language that a non-programmer can understand.

### 11.1 Model Selection Check

- **AI-R-011 (MUST)** Before responding to any project-related request, the agent MUST classify the task as one of:
  - Architecture / Planning
  - Debugging
  - Implementation
  - UI/UX
  - Database / Backend
  - DevOps
- **AI-R-012 (MUST)** Before any execution, the agent MUST recommend the most suitable model using the following mapping:
  - Opus 4.7 → architecture, deep reasoning, system decisions
  - GPT-5.4 → debugging, analysis, structured problem solving
  - Codex 5.3 → coding, implementation, refactoring
  - Sonnet 4.6 → UI/UX improvements
  - deepseek-coder-v2 → bulk edits / fast fixes
  - Gemini 3.1 Pro → brainstorming only
- **AI-R-013 (MUST)** Before doing anything else, the agent MUST output:
  - `Recommended model for this task: [MODEL NAME]`
  - `Reason: [short explanation]`
- **AI-R-014 (MUST NOT)** The agent must not assume final model approval automatically. Model usage must remain subject to explicit user confirmation or user override before execution.
- **AI-R-015 (MUST)** The agent MUST stop after providing the model recommendation and wait for explicit user approval before proceeding with any execution or solution.
- **AI-R-016 (MUST)** The agent MUST NOT provide full implementation, code changes, or final solutions before the user confirms or overrides the recommended model.

---

## 12. Change-Control & Exceptions

- **CHG-R-001 (MUST)** To change a rule, open a PR that:
  1. Edits this file.
  2. Bumps the version in §0.
  3. Contains an explicit owner approval in the PR description.
- **CHG-R-002 (MUST)** A one-off exception (e.g. to ship a design tweak outside the system) MUST be logged in a new `EXCEPTIONS.md` entry with: date, scope, reason, rollback plan. Undocumented exceptions are not exceptions; they are violations.
- **CHG-R-003 (MUST)** Any change to this constitution MUST be accompanied by a concise, context-appropriate update to `AZHUB_V2_DUSTUR_AR.md`. The Arabic file is a summarized mirror, not a line-by-line translation.

---

## 13. Glossary & References

| Term | Location |
|---|---|
| SSOT metrics | `lib/finance/metrics.ts` |
| Money helpers | `lib/finance/money.ts` |
| Schedule generator | `lib/finance/schedule-generator.ts` |
| Status resolver | `lib/finance/status-resolver.ts` |
| Date helpers | `lib/finance/date-smart.ts` |
| DB schema | `db/schema.ts` |
| DB migrations | `db/migrations/` |
| SQL views / policies | `db/sql/` |
| Investment status view | `db/sql/investment_status_view.sql` |
| Auth gate | `lib/auth.ts` |
| App shell | `app/(app)/layout.tsx` |
| Dashboard API | `app/api/dashboard/metrics/route.ts` |
| Wizard preview API | `app/api/investments/preview-schedule/route.ts` |
| Atomic receipt API | `app/api/cashflows/[id]/receive/route.ts` |
| Import flow | `app/api/import/preview/route.ts` → `app/api/import/commit/route.ts` |
| Share-link API | `app/api/share-links/*`, `app/api/share/[token]/route.ts` |
| Snapshots | `app/api/snapshots/*` |
| Health | `app/api/health/route.ts` |
| Env template | `.env.example` |
| Legacy archive | `legacy_reference/` (read-only) |

---

## FINAL SECTION — NON-NEGOTIABLE RULES ALL FUTURE AI AGENTS MUST READ BEFORE WRITING CODE

1. **Read this document end-to-end first.** (AI-R-001)
2. **The 9 canonical dashboard metrics are frozen.** Do not add, rename, or redefine them. (FIN-R-010)
3. **All money math goes through `lib/finance/money.ts`.** No `toFixed`. No floats. (FIN-R-003)
4. **Frontend never aggregates money.** It calls `/api/dashboard/metrics` and renders. (FIN-R-001, FIN-R-002)
5. **Investment status is NEVER stored.** It is derived by `investment_status_view`. (FIN-R-030)
6. **Cash ledger is append-only and sign-strict.** Never disable CHECK constraints. (FIN-R-023, FIN-R-024)
7. **Cashflow receipt is atomic.** One DB transaction updates the cashflow AND inserts the ledger row. (FIN-R-022)
8. **`db/schema.ts` changes require a migration file.** `drizzle-kit push` is forbidden in staging/prod. (DB-R-001, DB-R-002)
9. **SQL-only objects (views, policies) live in `db/sql/` and MUST NOT be recreated as Drizzle tables.** (DB-R-003)
10. **Every protected route calls `requireOwner()`.** No second auth path. (AUTH-R-002, AUTH-R-006)
11. **Share-link submissions land with `needsReview=true`** and are excluded from SSOT until approved. (UX-R-003, F12)
12. **Imports MUST go through preview-then-commit.** No auto-commit. (UX-R-010, F11)
13. **Do not introduce a second UI library or a custom Dialog/Select/etc.** Use `components/ui/*`. (DESIGN-R-001..003)
14. **Do not add a new top-level nav item.** The sidebar is ratified. (UX-R-007)
15. **Do not touch unrelated files.** PRs > 10 files for one feature require owner approval. (ENG-R-011)
16. **Do not "improve" code that is not part of the task.** (AI-R-003)
17. **Do not add dependencies casually.** Justify ≥ 100 LOC saved + ≥ 1M weekly downloads. (ENG-R-020)
18. **Do not import from `legacy_reference/`.** It is archaeology. (AI-R-010, ENG-R-012)
19. **Tests MUST be green.** `npm run lint && npm run typecheck && npm run test`. (TEST-R-005)
20. **Destructive migrations require a snapshot first.** Rollback via snapshot restore. (DB-R-012, DEP-R-003)
21. **No direct-to-production deploys.** local → staging → production. (DEP-R-001)
22. **Env variables MUST match `.env.example`.** `/api/health` is the gate. (DEP-R-005)
23. **Errors MUST be actionable.** Never ship a generic "Something went wrong". (UX-R-008)
24. **When blocked by a rule, stop and cite the rule ID.** Do not route around it. (AI-R-007)
25. **Explain things simply and directly unless the owner asks for more depth.** (AI-R-017)
26. **Clarity beats cleverness. Correctness beats clarity. Auditability beats correctness.**

---

*End of AZHUB_V2_CONSTITUTION.md*
