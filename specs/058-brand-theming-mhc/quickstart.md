# Quickstart & Validation Guide: Montana High Country Branding & Theming

How to run and validate the feature by milestone. References [contracts/design-tokens.md](./contracts/design-tokens.md), [contracts/brand-logo.md](./contracts/brand-logo.md), and [contracts/ui-theming.md](./contracts/ui-theming.md).

## Prerequisites

- Node 22 + dependencies in `apps/web` (`npm install`)
- Logo assets `sr-text.png` and `sr-badge.png` in `apps/web/public/` (M2)
- Backend optional for visual verification (auth flows need API for full journey)

## Run

```bash
# from apps/web
npm run dev      # http://localhost:5173
```

## Automated tests (primary verification)

```bash
# from apps/web
npm run test              # all Vitest suites including tests/theme/**
npm run test:coverage     # enforce ≥80% lines/functions/branches/statements
npm run build             # confirm production build after each milestone (Linear note)
```

Expected after M6: all tests pass, coverage gate satisfied, `legacyPalette.test.ts` and `designTokens.test.ts` green.

---

## Milestone validation

### M1 — Design tokens & typography (SPLR-79, SPLR-80, SPLR-81)

1. Inspect `:root` in `index.css` — four core color variables present with correct hex values.
2. DevTools → Computed styles on `body`: background cream, text brown, Inter font.
3. Any `<h1>` uses Zilla Slab bold brown.
4. No visual regressions on existing pages (ledger still readable).

### M2 — Logo assets & BrandLogo (SPLR-82, SPLR-83, SPLR-84)

1. `public/sr-text.png` and `public/sr-badge.png` load without 404.
2. `BrandLogo variant="text"` and `variant="badge"` render in unit tests.
3. Header or sidebar shows wordmark with adequate padding.
4. When shell supports collapse, badge logo appears in collapsed state.

### M3 — Shell & navigation theming (SPLR-85, SPLR-86, SPLR-87)

1. **Desktop**: Nav/sidebar background Lodgepole Brown; links cream; active item has orange left indicator.
2. **Content**: Main area Canvas Cream; ledger cards white on cream.
3. **Mobile** (DevTools ≤768px): Top bar/drawer matches brown/cream/orange rules.
4. **Interim**: If only `app__header` exists, header uses brown/cream tokens.

### M4 — Components (SPLR-88, SPLR-89, SPLR-90, SPLR-91)

1. Primary buttons orange with visible hover; secondary buttons visually distinct.
2. Cards, tables, modals white with subtle border/shadow on cream background.
3. Action-required badges are orange pills with white bold text.
4. Grep or legacy test: no denylisted hex in `index.css`.

### M5 — Auth & onboarding (SPLR-92, SPLR-93)

1. Login/register: cream backdrop, branded card, orange primary submit.
2. Org creation step matches auth styling.
3. Welcome modal: branded title font, orange dismiss button.
4. Keyboard tab order and focus rings still visible (WCAG from feature 006).

### M6 — Accessibility & regression (SPLR-94, SPLR-95)

1. `designTokens.test.ts` — all contrast pairings ≥ 4.5:1.
2. `legacyPalette.test.ts` — denylist scan passes.
3. Manual: axe DevTools or Lighthouse accessibility on login + dashboard — no contrast failures on primary text.
4. Epic definition of done: auth, dashboard, ledger, navigation match brand guide.

---

## Manual spot-check script

| Screen | What to verify |
|--------|----------------|
| Login | Cream bg, white card, orange submit, slab serif title |
| Register | Same as login |
| Dashboard / ledger | Cream canvas, white data blocks, brown typography |
| Navigation | Brown chrome, cream links, orange active state |
| Welcome modal (post-onboarding) | Branded modal + CTA |

Sign out and sign in to traverse auth → workspace → modal path in one session.

---

## Success criteria mapping

| Criterion | Validated by |
|-----------|--------------|
| SC-001 | Manual spot-check + legacy palette test |
| SC-002 | `designTokens.test.ts` + manual axe |
| SC-003 | Moderated check (active nav + CTA identifiable) |
| SC-004 | BrandLogo tests + manual sidebar collapse/mobile |
| SC-005 | `legacyPalette.test.ts` |
| SC-006 | `npm run test:coverage` |

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Fonts not loading | Network tab for Google Fonts; `@import` path |
| Cream-on-orange contrast fail | Switch CTA text to white; update token test |
| Shell classes missing | Merge vertical-navigation or apply interim header rules |
| Legacy hex test fails | Replace remaining literals with `var(--color-*)` |
