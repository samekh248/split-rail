# Data Model: Legacy Slate/Blue Color Token Migration (SPLR-91)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **design token definitions**, **semantic feedback utilities**, **migration target CSS blocks**, and **validation rules** — all client-side CSS contracts.

## Token entities (`:root` definitions)

### Existing tokens (consumption — no changes to hex values)

| Token | Role |
|-------|------|
| `--color-primary-brown` | Primary text on light surfaces |
| `--color-accent-orange` | Focus ring, accent emphasis |
| `--color-bg-cream` | Page background |
| `--color-surface-white` | Data containers, inputs, cards |
| `--color-text-on-dark` | Light text on brown chrome |
| `--color-text-muted` | Secondary copy |
| `--color-border-subtle` | Input and container borders |
| `--color-focus-ring` | Focus-visible outline (aliases accent orange) |
| `--color-error` | Error text and borders |
| `--color-error-bg` | Error banner background |
| `--color-error-border` | Error banner border |
| `--color-warning-bg` | Warning banners, session notices |
| `--color-warning-border` | Warning banner border |
| `--color-warning-text` | Warning banner text |

### New tokens (conditional — add if D4 research decision applied)

| Token | Role | Example value |
|-------|------|---------------|
| `--color-success` | Success text | `#15803d` (warm green) |
| `--color-success-bg` | Success banner background | `#f0fdf4` |
| `--color-success-border` | Success banner border | `#86efac` |

Register in `apps/web/src/theme/tokens.ts` `requiredCssVariables` when added.

## Semantic feedback utilities

### `.feedback-banner--success` (grouped with BEM modifiers)

| Attribute | Value |
|-----------|-------|
| Purpose | Positive operation feedback (invite sent, mapping saved) |
| Background | `var(--color-success-bg)` |
| Text | `var(--color-success)` |
| Border | `1px solid var(--color-success-border)` |
| Grouped selectors | `.team-section__banner--success`, `.unassigned-drawer__success`, `.feedback-banner--success` |

### `.feedback-banner--error` (grouped with BEM modifiers)

| Attribute | Value |
|-----------|-------|
| Purpose | Operation failure feedback |
| Background | `var(--color-error-bg)` |
| Text | `var(--color-error)` |
| Border | optional `var(--color-error-border)` |
| Grouped selectors | `.team-section__banner--error`, `.unassigned-drawer__error` |

### `.session-expired-notice`

| Attribute | Value |
|-----------|-------|
| Purpose | Auth session expiry informational notice |
| Tokens | `--color-warning-bg`, `--color-warning-border`, `--color-warning-text` |
| **Must NOT** | Legacy amber hex (`#fef3c7`, `#fcd34d`, `#92400e`) |

## Surface token map (white shorthand elimination)

| Selector | Property | Token |
|----------|----------|-------|
| `.dashboard-empty__cta` | `color` | `var(--color-text-on-dark)` |
| `.settings-layout__header` | `color` | `var(--color-text-on-dark)` |
| `.settings-nav__item` | `background` | `var(--color-surface-white)` |
| `.settings-layout__content` | `background` | `var(--color-surface-white)` |
| `.team-confirm` | `background` | `var(--color-surface-white)` |
| `.upcoming-view-toggle` | `background` | `var(--color-surface-white)` |
| `.upcoming-mini-calendar__day` | `background` | `var(--color-surface-white)` |
| `.financial-health-widget` | `background` | `var(--color-surface-white)` |
| `.unassigned-drawer` | `background` | `var(--color-surface-white)` |
| `.unassigned-drawer__workspace-link` | `background` | `var(--color-surface-white)` |
| `.accounting-overview` panel | `background` | `var(--color-surface-white)` |

## Out-of-scope exceptions

| Item | Location | Reason |
|------|----------|--------|
| Canvas signature ink | `SignaturePad.tsx` `#111` | Non-chrome drawing color (spec Assumptions) |
| `:root` canonical hex | `index.css` lines 5–22 | Token definition layer — not counted in FR-002 budget |
| Button/badge/container blocks | Various | Owned by SPLR-88/89/90 |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | `index.css` MUST NOT contain any `LEGACY_HEX_DENYLIST` value (case-insensitive) |
| VR-002 | Outside `:root`, hardcoded hex count MUST be ≤5; each MUST have inline comment (target: 0) |
| VR-003 | `.form-field__input` border MUST be `var(--color-border-subtle)` |
| VR-004 | `.form-field__input:focus-visible` outline MUST be `var(--color-focus-ring)` or `var(--color-accent-orange)` |
| VR-005 | `.form-field__input[aria-invalid='true']` border MUST be `var(--color-error)` |
| VR-006 | `.form-field__error` color MUST be `var(--color-error)` |
| VR-007 | Error feedback blocks MUST NOT use `#dc2626`, `#991b1b`, or raw `#fef2f2` |
| VR-008 | Success feedback blocks MUST use `--color-success-*` tokens after migration |
| VR-009 | `.session-expired-notice` MUST NOT use legacy amber hex literals |
| VR-010 | White shorthand `#fff` / `#ffffff` MUST NOT appear outside `:root` token definitions |
| VR-011 | New `:root` tokens MUST only be added when FR-006 ≥3-repeat rule satisfied |
| VR-012 | `tokens.ts` `requiredCssVariables` MUST include any new semantic tokens |

## Migration dependency graph

```text
:root token block (canonical hex)
        │
        ├── Form fields (already migrated — test only)
        ├── White surface shorthand → --color-surface-white
        ├── Dark chrome text → --color-text-on-dark
        ├── Session notice → warning tokens
        ├── Error banners → error tokens
        └── Success banners → success tokens (new, grouped utility)

legacyPalette.test.ts ──> VR-001
hexBudget.test.ts ──> VR-002
formFieldTokens.test.ts ──> VR-003..VR-006
colorMigration.test.ts ──> VR-007..VR-010
```
