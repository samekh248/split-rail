# Phase 1 Data Model: Montana High Country Design Tokens

This feature introduces **no persisted entities, API payloads, or database tables**. The data model is the **design token catalog** — client-side CSS custom properties with an optional TypeScript mirror for automated tests.

## Core color tokens

Canonical values per Montana High Country brand guide; runtime source is `:root` in `index.css`; test parity in `src/theme/tokens.ts`.

| Field | CSS variable | Hex | Brand name | FR |
|-------|--------------|-----|------------|-----|
| `primaryBrown` | `--color-primary-brown` | `#3E2723` | Lodgepole Brown | FR-001 |
| `accentOrange` | `--color-accent-orange` | `#E65100` | Alpine Sunset | FR-001 |
| `bgCream` | `--color-bg-cream` | `#F4F1EA` | Canvas Cream | FR-001 |
| `surfaceWhite` | `--color-surface-white` | `#FFFFFF` | Pure White | FR-001 |

### Validation rules

- Each core token MUST be declared exactly once in the token definition block.
- Hex values MUST match brand guide (case-insensitive in tests).
- No other brand palette hex literals MAY appear outside the token block (FR-005).

## Derived semantic tokens

| Field | CSS variable | Value / derivation | FR |
|-------|--------------|-------------------|-----|
| `textOnLight` | `--color-text-on-light` | `var(--color-primary-brown)` | FR-002 |
| `textOnDark` | `--color-text-on-dark` | `var(--color-bg-cream)` | FR-002 |
| `borderSubtle` | `--color-border-subtle` | Lodgepole Brown @ ~15% opacity | FR-002 |
| `radiusButton` | `--radius-button` | `4px`–`6px` (use `6px`) | FR-002 |
| `shadowCard` | `--shadow-card` | `0 2px 5px rgba(0, 0, 0, 0.05)` | FR-002 |

### Optional derived tokens (may exist from epic branch; not required for M1 acceptance)

| Field | CSS variable | Notes |
|-------|--------------|-------|
| `accentOrangeHover` | `--color-accent-orange-hover` | Darker shade for hover; does not replace canonical accent |
| `focusRing` | `--color-focus-ring` | Deferred to accessibility milestone |
| `textMuted` | `--color-text-muted` | Reduced-emphasis text; distinct from text-on-light |

## Document root defaults

| Element | Property | Token reference | FR |
|---------|----------|-----------------|-----|
| `:root` | `background` | `var(--color-bg-cream)` | FR-003 |
| `:root` | `color` | `var(--color-primary-brown)` | FR-003 |
| `body` | `background` | `var(--color-bg-cream)` | FR-004 |
| `body` | `color` | `var(--color-primary-brown)` | FR-004 |

### Validation rules

- `:root` and `body` MUST NOT use raw brand hex for `background` or `color` (SC-003).
- `body` MUST inherit the same cream/brown pairing as `:root`.

## WCAG contrast pairings (test model)

| Pairing ID | Foreground | Background | Min ratio |
|------------|------------|------------|-----------|
| `brown-on-cream` | `#3E2723` | `#F4F1EA` | 4.5 |
| `cream-on-brown` | `#F4F1EA` | `#3E2723` | 4.5 |
| `white-on-orange` | `#FFFFFF` | `#E65100` | 4.5 |

Validated in `designTokens.test.ts` via `contrastRatio()` from `src/theme/contrast.ts`.

## Relationships

```text
TokenDefinitionBlock (:root in index.css)
├── CoreColorToken (4)
│   └── referenced by DerivedSemanticToken via var()
├── DerivedSemanticToken (5 required for M1)
└── DocumentRootDefaults (:root + body)
        └── consume CoreColorToken via var()

tokens.ts (test mirror)
└── mirrors CoreColorToken hex + exports requiredCssVariables[]
```

## State transitions

Not applicable — tokens are static declarations. Global updates occur only when the token definition block is edited.

## Out of scope entities

The following entities from the parent epic (`058-brand-theming-mhc`) are **not** part of this data model:

- Typography roles (`heading`, `body`, `uiLabel`)
- Logo variant model
- Navigation layout state
- Legacy palette denylist enforcement (M4)
- UI surface tier component mapping (M3–M4)
