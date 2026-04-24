# AZHub Code Guardian

Default mode: do not load the full constitution unless the task touches a guarded area.

Always obey:
- Preserve the current v2 design style. No redesign, no random components, no new UI library.
- Frontend UI renders data; it must not derive portfolio-level finance math.
- Do not change dashboard metric definitions, financial logic, auth model, or schema without owner approval.
- Do not touch unrelated files or do opportunistic refactors.
- Do not import from `legacy_reference/`.

Read only the relevant constitution sections:
- UI-only: §§2, 3, 7
- Finance / metrics: §§4, 8, 12
- Auth: §§6, 8, 12
- Schema / migrations / SQL: §§5, 9, 12
- Deploy / CI: §§8, 9, 12

Guarded paths requiring approval before edits:
- `lib/finance/**`
- `app/api/**`
- `db/schema.ts`
- `db/migrations/**`
- `db/sql/**`
- `components/investment-wizard.tsx`

If blocked by a rule, stop and cite the rule ID.
`AZHUB_V2_CONSTITUTION.md` remains the source of truth.
