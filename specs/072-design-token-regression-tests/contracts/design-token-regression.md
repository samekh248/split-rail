# Contract: Design Token and Color Regression (SPLR-95)

Brand value parity and legacy-color guardrail contract for Montana High Country. Runtime source of truth: `apps/web/src/index.css` `:root`. Expected value record: `apps/web/src/theme/tokens.ts` (`colors`, `rootTokenParity`, `requiredCssVariables`). Legacy denylist: `apps/web/src/theme/legacyPalette.ts`. Test parity: `apps/web/tests/brand/designTokens.test.ts`.

## Single source of truth

| Role | Location | Updated when |
|------|----------|--------------|
| Expected primitives | `tokens.ts` → `colors` + `rootTokenParity` | Approved brand change |
| Runtime CSS | `index.css` → `:root { ... }` | Same PR as expected record |
| Legacy denylist | `legacyPalette.ts` → `LEGACY_HEX_DENYLIST` | New banned tone identified |
| Regression tests | `tests/brand/designTokens.test.ts` | New tokens or rules only |

**Must NOT** hardcode expected hex in test files except fixture data for `parseCssRoot` unit tests.

## `:root` primitive parity contract

Every `rootTokenParity` entry MUST match the parsed value from `index.css` `:root`:

```typescript
// tokens.ts — illustrative shape
export const rootTokenParity = [
  { cssVariable: '--color-primary-brown', expected: colors.primaryBrown, compareMode: 'hex' },
  { cssVariable: '--color-accent-orange', expected: colors.accentOrange, compareMode: 'hex' },
  { cssVariable: '--color-accent-orange-hover', expected: colors.accentOrangeHover, compareMode: 'hex' },
  { cssVariable: '--color-accent-orange-disabled', expected: colors.accentOrangeDisabled, compareMode: 'hex' },
  { cssVariable: '--color-bg-cream', expected: colors.bgCream, compareMode: 'hex' },
  { cssVariable: '--color-surface-white', expected: colors.surfaceWhite, compareMode: 'hex' },
  { cssVariable: '--color-error', expected: colors.error, compareMode: 'hex' },
  { cssVariable: '--color-error-bg', expected: colors.errorBg, compareMode: 'hex' },
  { cssVariable: '--color-success', expected: colors.success, compareMode: 'hex' },
  { cssVariable: '--color-success-bg', expected: colors.successBg, compareMode: 'hex' },
  { cssVariable: '--color-warning-bg', expected: colors.warningBg, compareMode: 'hex' },
  { cssVariable: '--color-text-muted', expected: 'rgba(62, 39, 35, 0.72)', compareMode: 'rgba' },
  { cssVariable: '--color-border-subtle', expected: 'rgba(62, 39, 35, 0.52)', compareMode: 'rgba' },
] as const;
```

### Comparison rules

| compareMode | Rule |
|-------------|------|
| `hex` | Case-insensitive; `#RGB` expanded to `#RRGGBB` before compare |
| `rgba` | Whitespace-normalized; channel order `rgba(r, g, b, a)` |
| `exact` | String equality for `var(--...)` alias declarations |

## Required variable presence contract

All names in `requiredCssVariables` MUST appear as keys in `parseRootCustomProperties(readFileSync('index.css'))`.

Removal or rename without updating `requiredCssVariables` and tests MUST fail CI (FR-002).

## Semantic alias wiring contract

These `:root` aliases MUST use exact `var()` targets (retain from existing `cssTokens.test.ts` or migrate to brand suite):

```css
--color-text-on-light: var(--color-primary-brown);
--color-text-on-dark: var(--color-bg-cream);
--color-text-on-accent: var(--color-surface-white);
--color-text-on-accent-disabled: var(--color-surface-white);
```

## Legacy hex denylist contract

Full `apps/web/src/index.css` content (case-insensitive) MUST NOT contain any value from `LEGACY_HEX_DENYLIST`:

```typescript
export const LEGACY_HEX_DENYLIST = [
  '#1e293b', '#2563eb', '#64748b', '#e2e8f0', '#f8fafc',
  '#cbd5e1', '#475569', '#f6f7f9', '#f1f5f9', '#0f172a',
] as const;
```

Minimum FR-004 coverage: `#1e293b`, `#2563eb`.

### Exceptions

If an exception is unavoidable, add to `LEGACY_HEX_EXCEPTIONS` in `legacyPalette.ts` with `reason` and run brand suite — default list is empty.

## Failure message contract

Vitest assertions MUST include identifiable context:

| Failure type | Message pattern |
|--------------|-----------------|
| Parity | `token parity: --color-primary-brown expected #3E2723 got #3E2724` |
| Missing | `missing required :root variable: --color-bg-cream` |
| Legacy | `legacy hex denylist: found #2563eb in index.css` |

## npm script contract

`package.json` MUST define:

```json
"test:brand": "vitest run tests/brand"
```

`npm test` MUST include `tests/brand/**` via default Vitest discovery (FR-006).

## Out of scope (explicit)

| Concern | Owner |
|---------|-------|
| WCAG contrast ratios | `tests/theme/designTokens.test.ts` (SPLR-94) |
| Hex budget outside `:root` | `tests/theme/hexBudget.test.ts` (SPLR-91) |
| Component selector migration | `tests/theme/colorMigration.test.ts` |
| Playwright visual snapshots | Future milestone |

## Maintainer update contract

Approved brand change procedure (FR-007):

1. Edit `colors` / `rootTokenParity` in `tokens.ts`.
2. Edit matching `:root` lines in `index.css`.
3. Run `npm run test:brand` — must pass before merge.
4. If adding token: extend `requiredCssVariables`, `rootTokenParity`, and `:root`.
5. Document visible change in PR description (ratios doc optional if contrast unaffected).

Intentional change without step 1 MUST fail parity tests (FR-002).

## Coverage contract

New/modified files `parseCssRoot.ts`, `rootTokenParity` exports, and `tests/brand/designTokens.test.ts` MUST achieve ≥80% line and branch coverage per Constitution III.
