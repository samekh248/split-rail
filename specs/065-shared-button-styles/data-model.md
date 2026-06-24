# Data Model: Shared Primary and Secondary Button Styles (SPLR-88)

This feature introduces **no persisted entities, API payloads, or database tables**. The model covers **shared button presentation classes**, **interaction states**, **surface-context variants**, and **validation rules** — all client-side CSS and component className contracts.

## Button style entities

### Primary button (`.btn-primary`)

| Attribute | Value |
|-----------|-------|
| Purpose | Highest-priority call-to-action on a surface |
| Background | `var(--color-accent-orange)` |
| Label color | `var(--color-surface-white)` |
| Typography | `var(--font-ui)`, weight 700, size 1rem |
| Radius | `var(--radius-button)` (6px) |
| Padding | `0.75rem 1rem` |
| Border | none |
| Hover (enabled) | `var(--color-accent-orange-hover)` + `var(--shadow-soft)` |
| Disabled | `opacity: 0.6`, `cursor: not-allowed` |
| Focus-visible | `outline: 2px solid var(--color-focus-ring)`, offset 2px |

### Primary compact (`.btn-primary--compact`)

| Attribute | Value |
|-----------|-------|
| Purpose | Inline/toolbar primary actions (sync, lock budget) |
| Visual | Same as primary except padding `0.5rem 1rem`, font-size `0.875rem` |
| Interaction states | Shared with `.btn-primary` via grouped selectors |

### Secondary button — light surface (`.btn-secondary`)

| Attribute | Value |
|-----------|-------|
| Purpose | Supporting action subordinate to primary on cream/white backgrounds |
| Background | `transparent` (hover: cream tint via `var(--color-bg-cream)` or `var(--color-surface-muted)`) |
| Label color | `var(--color-primary-brown)` |
| Border | `1px solid var(--color-border-subtle)` or `var(--color-primary-brown)` at reduced opacity |
| Typography | `var(--font-ui)`, weight 500–600, size 0.875rem |
| Radius | `var(--radius-button)` |
| Disabled | Same muted pattern as primary (`opacity: 0.6`) |
| Focus-visible | Brown or accent focus ring on light background |

### Secondary button — dark surface (`.btn-secondary--on-dark`)

| Attribute | Value |
|-----------|-------|
| Purpose | Supporting action on Lodgepole Brown navigation/shell chrome |
| Background | `transparent` |
| Label color | `var(--color-bg-cream)` |
| Border | `rgba(244, 241, 234, 0.4)` or equivalent cream at reduced opacity |
| Hover | `var(--color-nav-hover-overlay)` |
| Focus-visible | Cream outline (`2px solid var(--color-bg-cream)`) |

### Outline alias (`.btn-outline`)

| Attribute | Value |
|-----------|-------|
| Purpose | Legacy name for light-surface secondary; **same rules as `.btn-secondary`** on light surfaces |
| Note | Merge selector lists during implementation to avoid drift |

## FR-005 migration targets

| Component / surface | Required class | Component selector / test id |
|---------------------|----------------|------------------------------|
| Auth sign-in submit | `btn-primary` | `.auth-form__submit` in `LoginForm` |
| Auth register submit | `btn-primary` | `.auth-form__submit` in `RegisterForm` |
| Org creation submit | `btn-primary` | `.auth-form__submit` in `OrganizationCreateStep` |
| Welcome modal dismiss | `btn-primary` | `.welcome-modal__dismiss` |
| Dashboard empty retry | `btn-primary` | `.dashboard-empty__retry` |
| QBO sync now | `btn-primary--compact` | `[data-testid="sync-now-button"]` |
| QBO sync all | `btn-primary--compact` | `[data-testid="sync-all-button"]` |
| Settlement finalize | `btn-primary` | `[data-testid="finalize-settlement-btn"]` |
| Lock budget (in scope via epic) | `btn-primary--compact` | `.ledger-grid__lock-btn` |

## Interaction state model

```text
default ──hover──> accent-hover + shadow (primary) / background tint (secondary)
   │
   ├──disabled──> opacity 0.6, no pointer response
   │
   └──focus-visible──> outline ring (token-based)

loading (in-progress label) ──> retains base colors; label text may change ("Syncing…")
```

**Rule**: Loading state MUST NOT revert to browser default or legacy slate styling.

## Brand token map (consumption only — no new tokens)

| Token | Usage in button styles |
|-------|------------------------|
| `--color-accent-orange` | Primary fill |
| `--color-accent-orange-hover` | Primary hover fill |
| `--color-surface-white` | Primary label |
| `--color-primary-brown` | Secondary label/border (light) |
| `--color-bg-cream` | Secondary hover tint; dark-surface secondary label |
| `--color-border-subtle` | Secondary border (light) |
| `--color-nav-hover-overlay` | Secondary hover (dark) |
| `--color-focus-ring` | Primary focus outline |
| `--radius-button` | All button corners |
| `--shadow-soft` | Primary hover elevation |
| `--font-ui` | All button typography |

## Validation rules

| ID | Rule |
|----|------|
| VR-001 | `.btn-primary` background MUST be `var(--color-accent-orange)` |
| VR-002 | `.btn-primary` label color MUST be `var(--color-surface-white)` |
| VR-003 | `.btn-secondary` on light surfaces MUST use brown label and border tokens, NOT cream label |
| VR-004 | `.btn-secondary--on-dark` MUST use cream label/border for contrast on brown chrome |
| VR-005 | All FR-005 surfaces MUST include explicit `btn-primary` or `btn-primary--compact` class in TSX |
| VR-006 | Hover, disabled, and focus-visible states MUST be defined for primary and secondary variants |
| VR-007 | No `#1e293b` or other `LEGACY_HEX_DENYLIST` values in `index.css` |
| VR-008 | Button color rules MUST NOT introduce hardcoded brand palette hex outside `:root` token block |
| VR-009 | Migrated buttons MUST preserve existing `data-testid`, `type`, and click handlers |

## Out of scope entities

| Entity | Deferred to |
|--------|-------------|
| `.btn-danger`, `.btn-danger-outline` | Later M4 destructive styling |
| Ghost / link buttons | Later M4 milestones |
| Full `Button.tsx` component API | Optional future refactor (SPLR-91+) |
