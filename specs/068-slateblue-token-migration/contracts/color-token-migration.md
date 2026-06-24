# Contract: Color Token Migration (SPLR-91)

CSS token migration contract for remaining legacy hex elimination in `apps/web/src/index.css`. Runtime source of truth: `:root` token block + component/layout rules. Test parity: `legacyPalette.test.ts`, `hexBudget.test.ts`, `formFieldTokens.test.ts`, `colorMigration.test.ts`.

## Hex budget contract (FR-002)

1. Parse `index.css` and extract content **outside** the `:root { ... }` block.
2. Count hex color literals matching `#[0-9a-fA-F]{3,8}`.
3. **Pass**: count ≤ 5 and each match has a same-line or preceding-line comment containing `intentional hex`.
4. **Target**: count = 0 (preferred).

`:root` token definitions are **excluded** from the budget (canonical palette layer).

## Legacy denylist contract (FR-001)

All values in `@/theme/legacyPalette` `LEGACY_HEX_DENYLIST` MUST NOT appear anywhere in `index.css` (case-insensitive). Enforced by existing `legacyPalette.test.ts`.

## Form field contract (FR-003)

```css
.form-field__input {
  border: 1px solid var(--color-border-subtle);
  color: var(--color-primary-brown);
  background: var(--color-surface-white);
}

.form-field__input:focus-visible {
  outline: 2px solid var(--color-focus-ring); /* or var(--color-accent-orange) */
  border-color: var(--color-accent-orange);
}

.form-field__input[aria-invalid='true'] {
  border-color: var(--color-error);
}

.form-field__error {
  color: var(--color-error);
}
```

**Must NOT** contain `#2563eb`, denylisted slate hex, or other raw hex literals.

## Session notice contract

```css
.session-expired-notice {
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  color: var(--color-warning-text);
}
```

**Must NOT** contain `#fef3c7`, `#fcd34d`, `#92400e`.

## Success feedback contract

After migration, grouped selectors share token-only colors:

```css
.team-section__banner--success,
.unassigned-drawer__success,
.feedback-banner--success {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success-border);
}
```

`:root` additions (when implemented):

```css
--color-success: #15803d;
--color-success-bg: #f0fdf4;
--color-success-border: #86efac;
```

**Must NOT** contain `#ecfdf5`, `#065f46`, `#6ee7b7`, `#f0fdf4`, `#15803d` in rule bodies.

## Error feedback contract

```css
.team-section__banner--error,
.unassigned-drawer__error {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.team-modal__error,
.team-confirm__error {
  color: var(--color-error);
}
```

**Must NOT** contain `#dc2626`, `#991b1b`, `#fef2f2`, `#b91c1c` in rule bodies.

## White shorthand elimination contract

The following selectors MUST use `var(--color-surface-white)` for white backgrounds and `var(--color-text-on-dark)` for white text on brown chrome:

| Selector | Property | Required value |
|----------|----------|----------------|
| `.settings-nav__item` | `background` | `var(--color-surface-white)` |
| `.settings-layout__content` | `background` | `var(--color-surface-white)` |
| `.team-confirm` | `background` | `var(--color-surface-white)` |
| `.upcoming-view-toggle` | `background` | `var(--color-surface-white)` |
| `.upcoming-mini-calendar__day` | `background` | `var(--color-surface-white)` |
| `.financial-health-widget` | `background` | `var(--color-surface-white)` |
| `.unassigned-drawer` | `background` | `var(--color-surface-white)` |
| `.unassigned-drawer__workspace-link` | `background` | `var(--color-surface-white)` |
| `.accounting-overview` (panel block) | `background` | `var(--color-surface-white)` |
| `.dashboard-empty__cta` | `color` | `var(--color-text-on-dark)` |
| `.settings-layout__header` | `color` | `var(--color-text-on-dark)` |

## FR migration matrix

| FR | CSS target | Change | Test module |
|----|------------|--------|-------------|
| FR-001 | Entire `index.css` | Zero denylist hex | `legacyPalette.test.ts` |
| FR-002 | Outside `:root` | ≤5 hex (target 0) | `hexBudget.test.ts` |
| FR-003 | `.form-field__*` | Token-only (verify) | `formFieldTokens.test.ts` |
| FR-004 | Error blocks | Error token family | `colorMigration.test.ts` |
| FR-005 | Success/warning/session blocks | Token family | `colorMigration.test.ts` |
| FR-006 | `:root` | Success tokens only if ≥3 refs | `cssTokens.test.ts` |
| FR-007 | `components/**` | No new brand hex | Manual + grep |
| FR-008 | All above | Automated suite | Combined test run |

## Out of scope (do not modify)

| Area | Owner spec |
|------|------------|
| `.btn-primary`, `.btn-secondary`, `.btn-outline` | `065-shared-button-styles` |
| `.badge-action-required`, `.badge-alert` | `067-orange-alert-badges` |
| `.block-section`, `.ledger-table`, modal containers | `066-white-cream-containers` |
| WCAG contrast adjustments | SPLR-94 (downstream) |
| Full color regression suite | SPLR-95 (downstream) |

## Component exception

| File | Value | Status |
|------|-------|--------|
| `SignaturePad.tsx` | `#111` canvas stroke | Documented out-of-scope per spec Assumptions |

## Test contract summary

```bash
cd apps/web
npm run test -- tests/theme/legacyPalette.test.ts tests/theme/hexBudget.test.ts tests/theme/formFieldTokens.test.ts tests/theme/colorMigration.test.ts
npm run test:coverage
npm run build
```

**Pass criteria**: All tests green; coverage ≥80% on modified files; build succeeds.
