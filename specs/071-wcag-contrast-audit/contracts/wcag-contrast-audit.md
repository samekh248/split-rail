# Contract: WCAG AA Contrast Audit (SPLR-94)

Contrast pairing and token remediation contract for Montana High Country accessibility. Runtime source of truth: `apps/web/src/index.css` `:root` + `apps/web/src/theme/tokens.ts` `contrastPairings`. Test parity: `designTokens.test.ts`, `contrast.test.ts`, `contrastAudit.test.ts`.

## Threshold contract

| Category | minRatio | WCAG reference | Applies to |
|----------|----------|----------------|------------|
| `normal-text` | 4.5 | WCAG 2.x 1.4.3 AA | Body copy, labels, error/success/warning text, nav labels |
| `large-text` | 3.0 | WCAG 2.x 1.4.3 AA | Bold ≥700 at ≥14px, or ≥18px regular — primary CTAs, badges |
| `ui-component` | 3.0 | WCAG 2.x 1.4.11 AA | Borders, focus rings, essential non-text boundaries |

## `:root` token additions / changes

```css
:root {
  /* NEW — semantic alias for orange-surface labels */
  --color-text-on-accent: var(--color-surface-white);

  /* MODIFY — UI boundary contrast (from 0.15) */
  --color-border-subtle: rgba(62, 39, 35, 0.50);

  /* NEW — disabled CTA (values set during implementation to pass VR-001) */
  --color-accent-orange-disabled: /* TBD — warm muted orange */;
  --color-text-on-accent-disabled: var(--color-surface-white);
}
```

Implementation MUST re-measure and document final hex/rgba values in `contrast-audit.md`.

## CTA and badge contract

Primary and compact button groups MUST use:

```css
background: var(--color-accent-orange);
color: var(--color-text-on-accent);
```

Badge utilities MUST use:

```css
.badge-action-required,
.badge-alert {
  background: var(--color-accent-orange);
  color: var(--color-text-on-accent);
}
```

**Must NOT** use `var(--color-bg-cream)` or `var(--color-text-on-dark)` on orange backgrounds.

## Disabled CTA contract

Disabled primary/compact button groups MUST NOT rely on `opacity` alone to dim labels. Required pattern:

```css
.btn-primary:disabled,
/* ... grouped selectors ... */ {
  background: var(--color-accent-orange-disabled);
  color: var(--color-text-on-accent-disabled);
  opacity: 1;
  cursor: not-allowed;
}
```

Effective contrast for disabled label MUST be ≥3.0 (large-text category).

## TypeScript mirror contract

`src/theme/tokens.ts` MUST export:

```typescript
export const colors = {
  // ... existing ...
  textOnAccent: '#FFFFFF',
  accentOrangeDisabled: '/* TBD */',
  textOnAccentDisabled: '#FFFFFF',
} as const;

export const contrastPairings = [
  { id: 'brown-on-cream', foreground: '...', background: '...', minRatio: 4.5, category: 'normal-text' },
  // ... full inventory per data-model.md ...
] as const;
```

`requiredCssVariables` MUST include `--color-text-on-accent`, `--color-accent-orange-disabled`, `--color-text-on-accent-disabled`.

## Contrast helper contract

`src/theme/contrast.ts` MUST export:

| Function | Behavior |
|----------|----------|
| `contrastRatio(foregroundHex, backgroundHex)` | WCAG 2.1 ratio for `#RRGGBB` pair |
| `compositeRgbaOnHex(rgba, backgroundHex)` | Alpha-composite foreground onto background; return `#RRGGBB` |
| `meetsWcagAaNormalText(fg, bg)` | ratio ≥ 4.5 |
| `meetsWcagAaLargeText(fg, bg)` | ratio ≥ 3.0 |
| `meetsWcagAaUiComponent(fg, bg)` | ratio ≥ 3.0 |

## Vitest contracts

### `tests/theme/designTokens.test.ts`

MUST assert every `contrastPairings` entry:

```typescript
expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minRatio);
```

For rgba-derived pairings, tests MUST composite before measuring.

### `tests/theme/contrastAudit.test.ts`

MUST assert:

| Check | Method |
|-------|--------|
| Audit file exists | `apps/web/src/brand/contrast-audit.md` readable |
| All pairing ids documented | Each `contrastPairings[].id` appears in markdown |
| Token changes section | Present when any `:root` color value changes |
| No failing pairings | Implicit via `designTokens.test.ts` — audit reflects pass status |

### Regression contract (FR-010)

```bash
npm run test -- tests/auth/LoginForm.test.tsx tests/theme/
```

MUST pass without modification to test expectations (unless a11y association structure intentionally improved).

## Audit markdown contract

`apps/web/src/brand/contrast-audit.md` structure:

```markdown
# Montana High Country — WCAG AA Contrast Audit

## Summary
[Brief pass/fail counts, date, SPLR-94 reference]

## Methodology
[Relative luminance WCAG 2.1; compositing for rgba tokens]

## Pairing results
| id | foreground | background | ratio | threshold | category | status | notes |

## Token changes
| token | before | after | reason |
```

Table MUST be regenerated when `contrastPairings` or token values change.

## Pairing pass matrix (baseline — pre-implementation)

| id | Baseline ratio | Action |
|----|----------------|--------|
| `brown-on-cream` | 12.25 | None |
| `cream-on-brown` | 12.25 | None |
| `text-on-accent-on-orange` | 3.79 | Formalize token only |
| `border-subtle-on-white` | 1.33 | **Retune border token** |
| `border-subtle-on-cream` | 1.32 | **Retune border token** |
| `disabled-cta` (opacity model) | 2.22 | **Replace with disabled tokens** |

All other pairings in [data-model.md](../data-model.md) pass at baseline and require audit documentation only.
