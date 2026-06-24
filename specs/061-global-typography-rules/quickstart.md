# Quickstart & Validation Guide: Global Typography Rules

How to validate SPLR-81 end-to-end. See [contracts/global-typography.md](contracts/global-typography.md) and [data-model.md](data-model.md) for rule detail.

## Prerequisites

- **Upstream merged**: `059-mhc-design-tokens` and `060-brand-web-fonts` on your branch so `:root` defines `--font-heading`, `--font-ui`, `--color-primary-brown`, and `--color-bg-cream`.
- Node 22 + `npm install` in `apps/web`.

## Run

```bash
# from apps/web
npm run dev    # http://localhost:5173
```

## Automated tests (primary verification)

```bash
# from apps/web
npm run test              # includes tests/theme/typography.test.ts
npm run test:coverage     # ≥80% lines/functions/branches/statements (global gate)
```

**Expected**: typography CSS contract tests pass; existing suites (auth, pages, ledger) pass unchanged.

### Targeted typography run

```bash
npm run test -- tests/theme/typography.test.ts
```

## Manual validation scenarios

### P1 — Branded headings

1. **Dashboard**: Sign in → dashboard header `h1` ("Split Rail") renders in slab-serif, bold, primary brown.
2. **Auth**: Sign out → login card `h1` matches the same heading voice.
3. **Modal** (if available): Open any dialog with an `h1`–`h3` title → inherits global heading style without per-modal font CSS.

### P2 — UI sans-serif text

1. **Login form**: Inspect labels, inputs, and submit button → Inter/sans stack (`--font-ui`).
2. **Event ledger**: Table headers and cells use sans-serif; no monospace bleed except formula editor (out of scope).

### P3 — Text on dark

1. **App header**: Title/subtitle on dark header use cream legibility (via `.text-on-dark` or equivalent adoption).
2. **Utility**: Adding `.text-on-dark` to any label on a dark brown surface yields cream token color, not a one-off hex.

### Regression (FR-008)

At **≈375px** and **≈1280px** viewports, verify on:

| Page | Check |
|------|-------|
| Login | No horizontal overflow; title and fields readable |
| Dashboard home | Header and ledger area intact |
| Event ledger | Table columns fit; no clipped headings |

## Documentation check (SC-005)

Open `apps/web/src/index.css` → Typography comment block lists `h1`–`h3`, `.heading-brand`, UI element selectors, and `.text-on-dark` without reading individual page components.

## Success criteria mapping

| Criterion | Validated by |
|-----------|--------------|
| SC-001 | Manual P1 + CSS contract tests for heading selectors |
| SC-002 | Manual P2 + CSS contract tests for UI selectors |
| SC-003 | Manual regression table at both viewports |
| SC-004 | `npm run test` full suite |
| SC-005 | Typography comment block in `index.css` |
| SC-006 | `npm run test:coverage` global gate |

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `var(--font-heading)` unresolved | `060-brand-web-fonts` not merged |
| Headings still system font | Component `font-family` override; remove per override policy |
| Token tests fail | `059-mhc-design-tokens` not merged |
| Auth title wrong color | `.auth-layout__title` color override; remove, keep size/margin |
