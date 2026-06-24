# Contract: UI Theming Surfaces

Visual styling rules for shell, interactive components, and auth/onboarding surfaces. All colors via design tokens ([design-tokens.md](./design-tokens.md)). Class names follow existing BEM conventions in `index.css`.

## Navigation shell (M3 — SPLR-85, SPLR-86, SPLR-87)

### Left sidebar / nav chrome

| Element | Property | Token / value |
|---------|----------|---------------|
| Background | `background` | `--color-primary-brown` |
| Link text/icons | `color` | `--color-bg-cream` |
| Link hover | `background` | `--color-nav-hover-overlay` |
| Active item | left border 3px | `--color-accent-orange` |
| Active item text | `color` | `--color-bg-cream` (unchanged) |

**Classes** (when shell present): `.sidebar-rail`, `.global-nav__link`, `.global-nav__link--active`

**Interim** (current branch): `.app__header` adopts nav chrome tokens (brown bg, cream text) until `AppShell` merges.

### Main content canvas (FR-005)

| Element | Property | Token |
|---------|----------|-------|
| App main area | `background` | `--color-bg-cream` |
| Page padding | unchanged | existing layout |

**Classes**: `.app`, `.event-ledger-page`, `.dashboard-empty` backgrounds reference cream.

### Mobile top bar & drawer (FR-006)

Same token mapping as desktop sidebar. Drawer overlay backdrop may use semi-transparent brown or neutral dark — MUST NOT reintroduce legacy slate (`#0f172a` etc.).

**Classes**: `.top-bar`, `.mobile-nav-drawer` (when shell present).

---

## Buttons (M4 — SPLR-88)

### Primary CTA (FR-008)

| Property | Value |
|----------|-------|
| `background` | `--color-accent-orange` |
| `color` | `--color-bg-cream` or `--color-surface-white` (contrast-dependent) |
| `font-family` | `--font-ui` |
| `font-weight` | 700 |
| `border-radius` | `--radius-button` |
| `:hover` | `--color-accent-orange-hover` or `--shadow-soft` |
| `:focus-visible` | `--color-focus-ring` outline ≥ 2px |

**Class**: `.btn-primary`  
**Applies to**: `.auth-form__submit`, `.dashboard-empty__retry`, `.welcome-modal__dismiss`, sync/lock CTAs.

### Secondary (FR-009)

| Property | Value |
|----------|-------|
| `background` | transparent OR `--color-primary-brown` |
| `color` | `--color-primary-brown` (transparent variant) or `--color-bg-cream` (filled variant) |
| `border` | 1px solid `--color-primary-brown` (transparent variant) |

**Class**: `.btn-secondary`  
**Applies to**: `.app__logout` (restyled), cancel/back actions.

---

## Data cards, modals, tables (M4 — SPLR-89)

| Element | Property | Token |
|---------|----------|-------|
| Card/table/modal surface | `background` | `--color-surface-white` |
| Border | `border-color` | `--color-border-subtle` |
| Shadow (optional) | `box-shadow` | `--shadow-soft` |
| Heading inside card | `font-family` | `--font-heading` |

**Classes**: `.block-section`, `.ledger-grid__summary`, `.auth-layout__card`, `.welcome-modal`, `.artist-deal-panel`, table containers.

Page background behind cards MUST remain `--color-bg-cream`.

---

## Alert & action-required badges (M4 — SPLR-90)

| Property | Value |
|----------|-------|
| `background` | `--color-accent-orange` |
| `color` | `--color-surface-white` |
| `font-weight` | 700 |
| `font-size` | ~12px |
| `border-radius` | 9999px (pill) |
| `padding` | compact horizontal + vertical |

**Class**: `.badge-action-required`  
**Applies to**: QBO unmapped banners, variance flags where "action required" semantics apply.

---

## Auth & onboarding (M5 — SPLR-92, SPLR-93)

| Surface | Rules |
|---------|-------|
| `.auth-layout` backdrop | `--color-bg-cream` full viewport |
| `.auth-layout__card` | white surface, subtle border, heading uses `--font-heading` |
| `.auth-layout__title` | brown, slab serif |
| `.auth-layout__subtitle`, `.auth-layout__nav` | brown muted (opacity) — must pass contrast |
| `.auth-form__submit` | primary button contract |
| `.auth-layout__link` | accent orange, underline; focus ring visible |
| `.welcome-modal__backdrop` | semi-transparent overlay (not legacy slate) |
| `.welcome-modal` | white surface; title slab serif; dismiss = primary CTA |
| `OrganizationCreateStep` | same auth card + button rules |

Existing WCAG associations from feature 006 MUST be preserved (labels, `aria-invalid`, focus-visible).

---

## Focus visibility (edge case)

All interactive elements MUST retain visible `:focus-visible` outlines meeting 3:1 against adjacent colors. Focus ring color: `--color-focus-ring` (typically accent orange or high-contrast cream/white on brown).

---

## Hex migration scope (M4 — SPLR-91)

Priority files for `var(--color-*)` replacement:

1. `apps/web/src/index.css` (global — required)
2. Any component-level style blocks (none today — all in index.css)

Component files do NOT add inline `style={{ color: '#...' }}` hex values.

---

## Component test assertions

When updating existing tests, assert presence of token-backed classes rather than computed hex:

- Auth submit has class `btn-primary` (or equivalent)
- Auth layout card renders within `.auth-layout`
- Dashboard header uses nav chrome classes after M3

Do not snapshot full CSS output — assert class names and role/a11y contracts remain intact.
