# Design Guidelines: A.Z Finance Hub - Vision 2040

## Design Approach
System-based, mobile-first fintech dashboard design with strict visual consistency across all pages. The objective is clarity, density, and polished bilingual usability without random style drift.

## Core Design Principles

### Typography
- Arabic: Tajawal (primary)
- English: Poppins (primary)
- Canonical hierarchy:
  - Page title: `text-2xl` to `text-3xl`, `font-bold`
  - Section title: `text-lg`, `font-semibold`
  - Card title: `text-sm` to `text-base`, `font-medium`
  - Body text: `text-sm`
  - Labels/captions/helper: `text-xs`, `font-medium`

Language parity rules:
- `dir` follows language (`ar` => `rtl`, `en` => `ltr`) and is never hard-forced globally.
- Use direction-safe alignment and spacing (`text-start`, `ltr:*`, `rtl:*`) in shared primitives.
- Numeric and financial strings must stay readable in both languages.

### Layout System
- Canonical spacing scale: `2, 3, 4, 5` (use larger spacing only with justification).
- Standard card rhythm: `p-4 sm:p-5`.
- Standard control height: `h-10` for default input/select/button.
- Standard page rhythm: `space-y-4 sm:space-y-5`.
- Standard grid gaps: `gap-4 sm:gap-5`.

Anti-randomness policy:
- No one-off spacing/typography/color overrides unless documented and justified.
- Any UI change on one page must be checked against similar components/pages.

### Color System
- Neutral base with restrained semantic accents.
- Critical states (warning/error/defaulted/late) must have stronger contrast than neutral/info.
- Metric accents are allowed for meaning, but avoid noisy multi-color usage.

## Component Rules

### Shared Primitives First
- Prefer updates in shared UI primitives (`card`, `input`, `button`, `select`, `table`, `dialog`, `dropdown-menu`) before patching individual pages.
- Keep paddings, heights, and text sizes aligned across forms, dialogs, tables, and cards.

### Dashboard Rules
- Top metric cards must be readable on mobile and not over-compressed.
- Charts and cards must preserve balance: dense but uncluttered.
- Card labels should never drop below practical readability.

### Tables and Menus
- Use consistent cell padding and row density across pages.
- Dropdown/select items must maintain direction-aware spacing and no abnormal horizontal text gaps.

### Tables on narrow viewports
- Prefer **stacked cards** for the same row data below the `sm` breakpoint when a wide table would require horizontal scrolling (see recent investments list and custom cashflow editor).
- From `sm` and up, keep the full table with `overflow-x-auto` only when necessary; align numeric columns with `tabular-nums` for scanability.
- Chart areas that intentionally bleed to the edge on mobile (`-mx-*` + `overflow-x-auto`) are documented in `docs/VISUAL_QA_MATRIX.md` as a known pattern.

## Font Size Control
- App supports three global sizes: `small`, `medium`, `large`.
- Font size applies globally and must not break layout on mobile/tablet/laptop.
- Validate cards, tables, dialogs, and dropdowns across all three sizes.
- Use the **Font-size tiers** checklist in `docs/VISUAL_QA_MATRIX.md` when changing typography tokens or `data-font-size` behavior.

## Accessibility
- Maintain WCAG AA contrast where applicable.
- Preserve visible focus states for keyboard navigation.
- Ensure critical-state color is distinguishable and not color-only dependent.

This design system prioritizes consistency, readability, and professional polish while keeping the Vision 2040 product identity intact.