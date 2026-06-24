# Contract: Design Tokens

CSS custom property contract for Montana High Country theming. Source of truth at runtime: `apps/web/src/index.css` `:root` block. Test parity: `apps/web/src/theme/tokens.ts`.

## `:root` required properties

```css
:root {
  /* Colors — FR-001 */
  --color-primary-brown: #3E2723;
  --color-accent-orange: #E65100;
  --color-bg-cream: #F4F1EA;
  --color-surface-white: #FFFFFF;

  /* Derived (names required; values may adjust for WCAG — FR-013) */
  --color-accent-orange-hover: /* ~10% darker than accent */;
  --color-nav-hover-overlay: rgba(255, 255, 255, 0.1);
  --color-border-subtle: /* primary brown @ 15% opacity */;
  --color-focus-ring: /* meets 3:1 against adjacent bg */;

  /* Typography — FR-002 */
  --font-heading: 'Zilla Slab', serif;
  --font-ui: 'Inter', system-ui, sans-serif;

  /* Radius — FR-008 */
  --radius-button: 4px; /* or 6px per brand guide */
  --radius-card: 8px;

  /* Shadow — FR-005 */
  --shadow-soft: 0 2px 5px rgba(0, 0, 0, 0.05);
}
```

## Usage rules

1. **New styles MUST reference tokens** — no raw hex for brand colors in `index.css` or component CSS after M4 (FR-012).
2. **Semantic mapping** — use tokens by purpose, not by hex:
   - Navigation backgrounds → `--color-primary-brown`
   - Page backgrounds → `--color-bg-cream`
   - Data surfaces → `--color-surface-white`
   - CTAs / active indicators → `--color-accent-orange`
3. **Text on dark** (nav) → `--color-bg-cream`
4. **Text on light** (content) → `--color-primary-brown`
5. **CTA labels** → `--color-bg-cream` by default; switch to `--color-surface-white` if contrast test fails (FR-013).

## Legacy denylist (FR-014)

The following hex values MUST NOT appear in `apps/web/src/index.css` after migration completes:

| Denylisted hex | Replacement token |
|----------------|-------------------|
| `#1e293b`, `#1E293B` | `--color-primary-brown` |
| `#2563eb`, `#2563EB` | `--color-accent-orange` (links/CTAs) or `--color-focus-ring` |
| `#64748b`, `#475569` | `--color-primary-brown` with opacity OR new `--color-text-muted` derived from brown |
| `#e2e8f0`, `#cbd5e1` | `--color-border-subtle` |
| `#f8fafc`, `#f6f7f9`, `#f1f5f9` | `--color-bg-cream` or `--color-surface-white` |
| `#fff`, `#ffffff` (when used as surface) | `--color-surface-white` or `--color-bg-cream` as appropriate |

Vitest scan: `tests/theme/legacyPalette.test.ts` reads `index.css` and fails on any denylisted value (case-insensitive).

## Contrast test contract (FR-013, SC-002)

`tests/theme/designTokens.test.ts` MUST assert:

| Pairing | Foreground var/value | Background var/value | Min ratio |
|---------|---------------------|----------------------|-----------|
| Body text | `#3E2723` | `#F4F1EA` | 4.5 |
| Nav text | `#F4F1EA` | `#3E2723` | 4.5 |
| CTA label | cream or white | `#E65100` | 4.5 |

If cream-on-orange fails, document the switch to white in `:root` and update the test expectation.

## Font loading contract (SPLR-80)

- `@import` or `<link>` loads Zilla Slab 700 and Inter 400/500/700.
- `font-display: swap` on all `@font-face` or Google Fonts equivalent.
- Fallback stacks: `serif` for heading, `system-ui, sans-serif` for UI.
