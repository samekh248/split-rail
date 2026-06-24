# Phase 0 Research: Legacy Slate/Blue Color Token Migration (SPLR-91)

All Technical Context items resolved. Decisions grounded in Linear SPLR-91, dependency specs `065`–`067`, and current `apps/web` codebase on branch `068-slateblue-token-migration`.

## D1. Legacy denylist status — already clean

**Decision**: Treat legacy slate/blue migration as **already complete** for denylisted values. `legacyPalette.test.ts` passes; no `#1e293b`, `#2563eb`, `#64748b`, etc. remain in `index.css`.

**Rationale**: Prior M4 milestones and partial epic work removed slate/blue hex. SPLR-91 remaining scope is **residual one-off hex** (white shorthand, Tailwind-default greens/reds, amber session notice), not denylist values.

**Alternatives considered**:
- **Expand denylist to include `#dc2626`, `#fef2f2`**: rejected — these are semantic feedback colors to migrate to tokens, not legacy slate/blue palette.

## D2. Hex inventory — 25 literals outside `:root`

**Decision**: Migrate all hardcoded hex in component/layout rules to `var(--color-*)` references. Inventory (line numbers from current `index.css`):

| CSS block | Hex values | Target |
|-----------|------------|--------|
| `.session-expired-notice` | `#fef3c7`, `#fcd34d`, `#92400e` | `--color-warning-bg`, `--color-warning-border`, `--color-warning-text` |
| `.dashboard-empty__cta` | `#fff` (text) | `var(--color-text-on-dark)` |
| `.settings-layout__header` | `#fff` (text) | `var(--color-text-on-dark)` |
| `.settings-nav__item`, `.settings-layout__content`, `.team-confirm`, `.upcoming-view-toggle`, `.upcoming-mini-calendar__day`, `.financial-health-widget`, `.unassigned-drawer`, `.unassigned-drawer__workspace-link`, `.accounting-overview` panel | `#fff` (background) | `var(--color-surface-white)` |
| `.team-section__banner--error` | `#fef2f2`, `#b91c1c` | `--color-error-bg`, `--color-error` |
| `.team-section__banner--success` | `#f0fdf4`, `#15803d` | shared success utility (see D4) |
| `.team-modal__error`, `.team-confirm__error` | `#dc2626` | `var(--color-error)` |
| `.unassigned-drawer__success` | `#ecfdf5`, `#065f46`, `#6ee7b7` | shared success utility (see D4) |
| `.unassigned-drawer__error` | `#fef2f2`, `#991b1b` | `--color-error-bg`, `--color-error` |

**Rationale**: FR-002 targets ≤5 intentional hex outside `:root`; full migration to tokens achieves zero exceptions (preferred over documenting five).

**Alternatives considered**:
- **Leave `#fff` as documented exceptions**: rejected — 9+ occurrences; must use existing surface/text tokens per spec edge case guidance.

## D3. Form fields — already tokenized

**Decision**: Form field styles (`.form-field__input`, focus, error) **already use tokens** (`--color-border-subtle`, `--color-focus-ring`, `--color-error`). Add **`formFieldTokens.test.ts`** to lock FR-003; no CSS changes expected unless regression found.

**Rationale**: Lines 1567–1591 in `index.css` already reference semantic tokens. Linear acceptance criterion "form inputs use brown borders/focus rings" is satisfied; tests prevent regression.

**Alternatives considered**:
- **Rewrite form block**: unnecessary duplication.

## D4. Success feedback — shared utility vs new `:root` tokens

**Decision**: Introduce **shared grouped selectors** `.feedback-banner--success` (and alias existing BEM modifiers into the group) with **new `:root` success tokens**:

```css
--color-success: #15803d;
--color-success-bg: #f0fdf4;
--color-success-border: #86efac;
```

Harmonize `.unassigned-drawer__success` cool greens (`#ecfdf5`, `#065f46`, `#6ee7b7`) to the same warm success trio for visual consistency.

**Rationale for ≥3 rule (FR-006)**: After consolidation, success tokens are referenced by **three selectors**: `.team-section__banner--success`, `.unassigned-drawer__success`, and grouped `.feedback-banner--success`. Token definitions live in `:root` (canonical hex layer); component rules use `var()` only.

**Alternatives considered**:
- **Keep two different green palettes**: rejected — violates warm harmonization (User Story 3).
- **Skip new tokens with only 2 sites**: rejected — success semantic role requires dedicated tokens; third grouped selector satisfies FR-006.

## D5. Error feedback — reuse existing tokens

**Decision**: Map all error banners, drawer errors, and modal error text to existing `--color-error`, `--color-error-bg`, `--color-error-border`. Replace `#dc2626` and `#991b1b` with `var(--color-error)`.

**Rationale**: Error tokens already defined at `:root` (lines 16–18). Four error-surface occurrences exceed ≥3 threshold for reuse without new tokens.

**Alternatives considered**:
- **New `--color-error-text` alias**: unnecessary — `--color-error` suffices.

## D6. Session expired notice — warning tokens

**Decision**: Replace `.session-expired-notice` amber hex with `--color-warning-bg`, `--color-warning-border`, `--color-warning-text` (already in `:root`).

**Rationale**: Session notice is informational/warning semantics, not action-required orange pill (owned by SPLR-90). Warning tokens provide warm harmonized amber tone.

**Alternatives considered**:
- **Orange pill styling**: wrong semantic category for session expiry copy.

## D7. Component inline hex — SignaturePad exception

**Decision**: Retain `#111` canvas stroke in `SignaturePad.tsx` as **documented out-of-scope exception** (non-chrome drawing ink per spec Assumptions). Do not migrate to brand tokens.

**Rationale**: Spec explicitly allows canvas/signature ink exceptions. Only one component inline hex found in `apps/web/src/components/**`.

**Alternatives considered**:
- **Tokenize ink color**: over-engineering for canvas drawing.

## D8. Scope boundaries — do not duplicate M4 siblings

**Decision**: **Exclude** from this migration:
- `.btn-primary`, `.btn-secondary`, badge utilities (SPLR-88/90)
- `.block-section`, `.ledger-table`, modal containers (SPLR-89)
- Any surface already covered by `dataContainers.test.ts`, `buttons.test.ts`, `badges.test.tsx`

**Rationale**: Spec Assumptions and Linear dependency graph. Touch only remaining hex debt listed in D2.

**Alternatives considered**:
- **Full index.css audit including buttons**: duplicate work; risks merge conflicts with open M4 PRs.

## D9. Test strategy

**Decision**: Four-layer verification:

1. **Denylist scan** (`legacyPalette.test.ts`) — already passing; keep in CI.
2. **Hex budget** (`hexBudget.test.ts`) — parse `index.css`, strip `:root` block, assert ≤5 hex literals (target 0) with comment requirement if any remain.
3. **Form field contract** (`formFieldTokens.test.ts`) — assert `.form-field__*` rules use token refs, not hex or `#2563eb`.
4. **Migration map** (`colorMigration.test.ts`) — assert each block in D2 inventory uses specified `var(--color-*)` per [contracts/color-token-migration.md](./contracts/color-token-migration.md).

Update `tokens.ts` `requiredCssVariables` if success tokens added.

**Rationale**: Constitution III; matches M4 CSS file-read test patterns. SPLR-95 will add broader color regression later.

**Alternatives considered**:
- **Visual snapshot testing**: deferred to SPLR-95.
- **Stylelint plugin**: not in project toolchain today; Vitest sufficient for this milestone.

## D10. Dependency sequencing

**Decision**: Implement after SPLR-88/89/90 merged to `main` (or rebase this branch atop them). Verify no duplicate edits to button/badge/container blocks.

**Rationale**: Linear `blockedBy` relations. Reduces conflict surface.

**Alternatives considered**:
- **Parallel implementation with merge resolution**: acceptable on feature branch but plan assumes dependencies landed first.
