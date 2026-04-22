# A.Z Hub — Project instructions & constitution (April 2026)

This file guides humans and AI agents working on this repository. **Conversation with Ahmed:** Arabic. **Code, comments, commit messages:** English.

## Governance baseline (mandatory)

For product intent, boundaries, and change acceptance rules, always follow:

- `docs/PRODUCT_CONSTITUTION.md`
- `docs/CHANGE_GUARDRAILS.md`

If older notes conflict with these documents, treat the constitution and guardrails as the active source of truth.

---

## Vision & goal

Build a unified **investment command center (Dashboard)** that aggregates data from investment platforms (Sukuk, Tamayyuz, Manfa'a, etc.) into **one** professional interface. Priorities: **accuracy of financial numbers**, clarity of cashflows, and excellent access from **phone, iPad, and laptop**, with development primarily on **HP OMEN** (local-first, privacy-friendly).

---

## Hardware & local AI stack (authoritative)

- **GPU:** NVIDIA RTX 3070 (**8 GB VRAM**)
- **RAM:** **16 GB** system RAM  
- **Priority:** Accuracy and reasoning quality over raw speed. Prefer **smaller, well-quantized** models that fit VRAM over oversized models that thrash or degrade.

### Ollama (local model backend)

Use **[Ollama](https://ollama.com)** as the **free local runtime** for LLMs on this machine. Pull and run models with enough headroom for the OS, browser, and IDE (do not max out VRAM).

**Approved model roles (April 2026 plan):**

| Role | Model | Purpose |
|------|--------|---------|
| **The Coder** | `qwen2.5-coder:7b` (or equivalent tag, e.g. `qwen2.5-coder:7b-instruct`) | Implementation: TypeScript/React, server code, SQL/Drizzle, automation scripts (including Python data pulls when needed). |
| **The Architect / Reviewer** | `llama3:8b` (or `llama3.1:8b` / `llama3.2` 8B per Ollama naming) | Data modeling, cross-platform semantics, consistency checks, and **structured review** (security mindset, requirement traceability). |

> **Note:** One 8B model can play both "architecture" and "review" with **different system prompts** and checklists. If VRAM is tight, run **one model at a time** in Ollama rather than two concurrent loads.

**Operational tips:**

- Keep **temperature low** for anything touching money (e.g. `0.1–0.3`).
- Never treat model output as financial truth without **schema + tests + user confirmation**.
- For Cursor: configure **custom / Ollama** endpoints only where the product supports it; primary app code still lives in this repo.

---

## Digital trio (workflow, maps to Ollama)

1. **Architect (Llama 3 8B via Ollama):** Schema design, unified metrics definitions, how platforms map into one ledger (no "hidden walls" between platforms in the **logical** model).
2. **Coder (Qwen2.5-Coder 7B via Ollama):** Fast, idiomatic implementation; respects existing patterns in the codebase.
3. **Reviewer (Llama 3 8B via Ollama, separate prompt):** Security and correctness review — auth/session handling, injection risks, secret handling, alignment with this document.

**Cursor Agent mode:** Use for multi-file refactors, migrations, and path fixes (per team protocol).

---

## Dashboard standards

- **Single financial truth:** Numbers roll up to one main view ("the financial gist") without per-platform silos in the UX.
- **Responsive / mobile-first:** Large tap targets, readable typography, dark mode support.
- **Visual intelligence:** Interactive charts for portfolio growth and liquidity split across platforms where it adds clarity.

---

## Technical stack (project)

- **Database:** SQLite file **`local.db`** at project root (Drizzle ORM). No cloud DB required for current local development path.
- **Server listen address:** Default **`0.0.0.0`** so other devices on the **home LAN** (iPad, phone) can open the app. Override with `HOST` if needed (e.g. `HOST=127.0.0.1` for localhost-only).
- **Port:** `PORT` environment variable, default **5000**.
- **OCR (future):** Screenshots from investment apps to structured data is a **planned** feature; treat outputs as **draft** until user confirms amounts.

---

## Security & privacy (non-negotiable)

- **Never** commit secrets: API keys, passwords, `.env` with real credentials, or platform login cookies.
- **LAN exposure (`0.0.0.0`):** Only trusted networks. Prefer Windows Firewall rules; do not port-forward to the public internet without TLS and hardening.
- **No storing third-party platform passwords in plain text** in the app database.

---

## Roleplay with multiple models (local discipline)

1. **Architect pass:** Produce or refine **schemas, invariants, and edge cases** (Arabic OK for explanations to Ahmed; diagrams OK).
2. **Coder pass:** Implement with **tests / typecheck** (`npm run check`) and minimal scope.
3. **Reviewer pass:** Re-read diff as if adversarial; call out auth, SQL injection, XSS, and financial rounding.

If models disagree, **resolve with code + tests**, not with longer chat.

---

## Quick commands

```bash
npm run dev          # Dev server (listens on 0.0.0.0:PORT by default)
npm run check        # TypeScript
npm run db:push      # Drizzle to SQLite schema push
npx tsx server/seed.ts   # Example seed (platforms)
```

---

## Document control

- **Owner:** Ahmed — A.Z Hub  
- **Review:** When stack or model choices change, update this file and note the date in the title or a changelog section.
