# Contract: Design Tokens (M1 — SPLR-79)

CSS custom property contract for the Montana High Country token foundation. Runtime source of truth: `apps/web/src/index.css` `:root` block. Test parity: `apps/web/src/theme/tokens.ts`.

## `:root` required properties

```css
:root {
  /* Core colors — FR-001 */
  --color-primary-brown: #3E2723;
  --color-accent-orange: #E65100;
  --color-bg-cream: #F4F1EA;
  --color-surface-white: #FFFFFF;

  /* Semantic derived — FR-002 */
  --color-text-on-light: var(--color-primary-brown);
  --color-text-on-dark: var(--color-bg-cream);
  --color-border-subtle: rgba(62, 39, 35, 0.15);

  /* Radius & shadow — FR-002 */
  --radius-button: 6px;
  --shadow-card: 0 2px 5px rgba(0, 0, 0, 0.05);

  /* Document defaults — FR-003 */
  color: var(--color-primary-brown);
  background: var(--color-bg-cream);
}
```

## `body` required properties

```css
body {
  color: var(--color-primary-brown);
  background: var(--color-bg-cream);
}
```

## Usage rules (M1)

1. **Single source of truth** — brand palette hex values MUST appear only inside the `:root` token definition block (FR-005).
2. **Semantic references** — new styles SHOULD use semantic tokens (`--color-text-on-light`, `--color-border-subtle`) or core tokens via `var()`, never raw brand hex.
3. **No component restyling in M1** — existing component rules may still contain legacy hex; migrating them is out of scope.
4. **Accent contrast** — when orange is used as a background for text, use `--color-surface-white` for labels (white-on-orange pairing).

## TypeScript mirror contract

`src/theme/tokens.ts` MUST export:

```typescript
export const colors = {
  primaryBrown: '#3E2723',
  accentOrange: '#E65100',
  bgCream: '#F4F1EA',
  surfaceWhite: '#FFFFFF',
} as const;

export const requiredCssVariables = [
  '--color-primary-brown',
  '--color-accent-orange',
  '--color-bg-cream',
  '--color-surface-white',
  '--color-text-on-light',
  '--color-text-on-dark',
  '--color-border-subtle',
  '--radius-button',
  '--shadow-card',
] as const;
```

Values MUST match `:root` declarations (case-insensitive hex comparison in tests).

## Vitest contract

### `tests/theme/cssTokens.test.ts`

MUST assert:

| Check | Method |
|-------|--------|
| All `requiredCssVariables` present in `index.css` | `readFileSync` + `toContain` |
| Core color hex values match `tokens.ts` | regex or string match |
| `:root` background/color use `var(--color-bg-cream)` and `var(--color-primary-brown)` | regex |
| `body` background/color use same token references | regex |

### `tests/theme/designTokens.test.ts`

MUST assert WCAG AA contrast ≥ 4.5:1 for:

| Pairing | Foreground | Background |
|---------|------------|------------|
| Body text | `#3E2723` | `#F4F1EA` |
| Nav text (future) | `#F4F1EA` | `#3E2723` |
| CTA label | `#FFFFFF` | `#E65100` |

## Build contract

`npm run build` in `apps/web` MUST succeed after token changes (FR-006).

## Out of scope (deferred)

- Font loading (`--font-heading`, `--font-ui`) — SPLR-80
- Typography global rules — SPLR-81
- Legacy hex denylist scan of full `index.css` — M4 / parent epic
- Component button/card/nav restyling — SPLR-85+

## Delta from current branch

If `index.css` contains `--color-accent-orange: #c45100`, M1 implementation MUST realign to `#E65100` and update `tokens.ts` + `cssTokens.test.ts` expectations accordingly. White-on-orange contrast test replaces darker-orange workaround.
