# Contract: Shared Button Styles (SPLR-88)

CSS class contract for Montana High Country primary and secondary buttons. Runtime source of truth: `apps/web/src/index.css` shared button block. Test parity: `apps/web/tests/theme/buttons.test.tsx`, component theme tests.

## Required CSS classes

### `.btn-primary` (standard primary)

```css
.btn-primary {
  padding: 0.75rem 1rem;
  background: var(--color-accent-orange);
  color: var(--color-surface-white);
  border: none;
  border-radius: var(--radius-button);
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-orange-hover);
  box-shadow: var(--shadow-soft);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### `.btn-primary--compact` (toolbar primary)

Same token usage as `.btn-primary` with `padding: 0.5rem 1rem` and `font-size: 0.875rem`. Hover, disabled, and focus-visible rules MUST be grouped with standard primary.

### `.btn-secondary` (light-surface secondary)

```css
.btn-secondary {
  padding: 0.375rem 0.75rem;
  background: transparent;
  color: var(--color-primary-brown);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-button);
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-cream);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### `.btn-secondary--on-dark` (dark-chrome secondary)

Cream label/border variant for brown navigation surfaces. Replaces prior `.btn-secondary` dark-surface-only styling.

## Usage rules

1. **Token-only colors** — button blocks MUST reference `var(--color-*)` and `var(--radius-button)`; no brand hex literals in button rules (FR-004, FR-008).
2. **Explicit classes on FR-005 surfaces** — high-traffic TSX buttons MUST include `btn-primary` or `btn-primary--compact` in `className` (VR-005).
3. **Layout vs theme** — component BEM classes (e.g., `.auth-form__submit { width: 100% }`) MAY set layout only; color/typography/interaction MUST come from shared classes.
4. **One primary per action group** — when primary and secondary appear together, only the main CTA uses `.btn-primary`; supporting actions use `.btn-secondary` or `.btn-outline` alias.
5. **Legacy slate prohibition** — submit-style and primary CTA rules MUST NOT contain `#1e293b` or denylisted values from `legacyPalette.ts`.

## FR-005 migration matrix

| File | Element | Required className addition |
|------|---------|----------------------------|
| `components/auth/LoginForm.tsx` | submit button | `auth-form__submit btn-primary` (verify) |
| `components/auth/RegisterForm.tsx` | submit button | `auth-form__submit btn-primary` (verify) |
| `components/onboarding/OrganizationCreateStep.tsx` | submit button | `auth-form__submit btn-primary` (verify) |
| `components/onboarding/WelcomeModal.tsx` | dismiss button | `welcome-modal__dismiss btn-primary` (verify) |
| `pages/DashboardOverviewPage.tsx` | retry buttons | `dashboard-empty__retry btn-primary` |
| `pages/AccountingOverviewPage.tsx` | retry buttons | `dashboard-empty__retry btn-primary` |
| `pages/EventWorkspacePage.tsx` | retry buttons | `dashboard-empty__retry btn-primary` (if present) |
| `components/qbo/SyncNowButton.tsx` | sync button | `sync-now-button btn-primary--compact` |
| `components/qbo/SyncAllButton.tsx` | sync button | `sync-all-button btn-primary--compact` |
| `components/settlement/FinalizeSettlementPanel.tsx` | finalize button | `btn-primary` (+ optional BEM hook) |
| `components/ledger/LedgerGrid.tsx` | lock button | `ledger-grid__lock-btn btn-primary--compact` (verify) |

## Test contract

### CSS file tests (`tests/theme/buttons.test.tsx`)

MUST assert:

- `.btn-primary` uses `var(--color-accent-orange)` background and `var(--color-surface-white)` color
- `.btn-primary--compact` shares accent tokens
- `.btn-secondary` uses `var(--color-primary-brown)` label and token-based border
- Hover rules reference `var(--color-accent-orange-hover)` for primary
- Disabled rules set `opacity: 0.6`
- Focus-visible rules reference `var(--color-focus-ring)` or cream ring for dark secondary

### Component theme tests

MUST assert `toHaveClass('btn-primary')` or `toHaveClass('btn-primary--compact')` on:

- `finalize-settlement-btn`
- `sync-now-button`
- `sync-all-button`
- `dashboard-empty__retry` (at least one representative page test)

Existing tests (`WelcomeModal.theme.test.tsx`, `OrganizationCreateStep.theme.test.tsx`) MUST continue passing.

### Legacy palette test

`tests/theme/legacyPalette.test.ts` MUST pass (no denylisted hex in `index.css`).

## Out of contract (this milestone)

- Destructive button styling (`.btn-danger*`)
- Auth layout chrome colors (SPLR-92)
- Welcome/onboarding flow layout theming beyond button classes (SPLR-93)
- Remaining legacy slate/blue hex in non-button component rules (SPLR-91)
