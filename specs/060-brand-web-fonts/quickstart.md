# Quickstart & Validation Guide: Brand Web Fonts (SPLR-80)

How to validate SPLR-80 font foundation. References [contracts/brand-fonts.md](./contracts/brand-fonts.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 22 + dependencies in `apps/web` (`npm install`)
- On branch `060-brand-web-fonts`
- SPLR-79 color tokens present in `index.css` `:root` (from `059-mhc-design-tokens` or merged epic work)

## Run

```bash
cd apps/web
npm run dev      # http://localhost:5173
```

## Automated tests (primary verification)

```bash
cd apps/web
npm run test -- tests/theme/typography.test.ts tests/security/contentSecurityPolicy.test.ts
npm run test:coverage   # ≥80% gate on modified theme/security modules
npm run build             # FR-005 — production build must succeed
```

**Expected**: Typography and CSP test files pass; build succeeds.

---

## SPLR-80 validation checklist

### 1. Google Fonts import

Open `apps/web/src/index.css` line 1 and confirm:

- `@import url('https://fonts.googleapis.com/css2?...')` is present
- URL includes `Zilla+Slab:wght@700` and `Inter:wght@400;500;700`
- `display=swap` is present
- No duplicate Google Fonts `<link rel="stylesheet">` in `index.html`

### 2. Font tokens in `:root`

| Variable | Expected stack |
|----------|----------------|
| `--font-brand` | `'Zilla Slab', 'Rokkitt', 'Roboto Slab', serif` |
| `--font-ui` | `'Inter', 'Open Sans', 'Lato', sans-serif` |

Confirm tokens sit in the same `:root` block as color tokens.

### 3. Body default font

In DevTools → Elements → `body`:

- Computed `font-family` starts with **Inter** (after fonts load)
- Stylesheet shows `font-family: var(--font-ui)`

### 4. Production CSP allowlist

Inspect `apps/web/src/security/contentSecurityPolicy.ts`:

- `style-src` includes `https://fonts.googleapis.com`
- `font-src` includes `https://fonts.gstatic.com`

Confirm `firebase.json` hosting CSP header matches the TS constant (automated test covers this).

### 5. TypeScript mirror parity

`apps/web/src/theme/tokens.ts`:

- `fonts.brand` and `fonts.ui` match `:root` stacks
- `requiredCssVariables` includes `--font-brand` and `--font-ui`

### 6. Manual FOUT check (auth screens)

1. Open `/login` (or registration) with dev server running.
2. Hard-refresh once.
3. Watch headings and form labels during load.

**Pass**: no obvious text reflow or size jump when web fonts apply.

---

## Visual spot-check (optional)

1. Load login page → heading text should appear in **Zilla Slab** (slab-serif, bold).
2. Body labels and inputs should appear in **Inter** (clean sans-serif).
3. Disable network to `fonts.gstatic.com` → page should still render with fallback stacks (Rokkitt/Roboto Slab or Open Sans/Lato).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Fonts blocked in production | CSP missing `style-src` / `font-src` | Update `contentSecurityPolicy.ts` + `firebase.json` per contract |
| `typography.test.ts` fails on `--font-heading` | Rename incomplete | Replace with `--font-brand` everywhere |
| Inter not applied on body | Missing `body { font-family: var(--font-ui) }` | Wire per contract |
| Double font fetch | Both `@import` and `<link>` present | Remove duplicate per FR-007 |
| Build fails | Malformed `@import` syntax | Validate URL quoting and semicolon |

---

## Next milestone (after SPLR-80)

- **SPLR-81** — Apply global typography rules for headings and UI text

Run `/speckit-tasks` to generate implementation tasks for this feature.
