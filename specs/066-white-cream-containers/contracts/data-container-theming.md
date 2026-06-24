# Contract: Data Container Theming (SPLR-89)

CSS class contract for Montana High Country white-on-cream data surfaces. Runtime source of truth: `apps/web/src/index.css` container blocks. Test parity: `apps/web/tests/theme/dataContainers.test.ts`, `LedgerGrid.theme.test.tsx`, `EventCard.theme.test.tsx`.

## Shared inline container base

Grouped selector for ledger and dashboard data cards (implement as merged block or equivalent duplicate-free rules):

```css
.block-section,
.ledger-grid__summary,
.artist-deal-panel,
.ledger-grid__artists,
.event-card {
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}
```

Component-specific layout (padding, flex, gap, margins) remains on individual selectors.

## Modal panel (`.welcome-modal`)

```css
.welcome-modal {
  background: var(--color-surface-white);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px; /* modal may retain 12px; inline cards use --radius-card */
  box-shadow: var(--shadow-modal);
}
```

Team modals reusing `.welcome-modal` inherit this contract.

## Table header (`.ledger-table th`)

```css
.ledger-table th {
  background: var(--color-bg-cream);
  /* borders and padding via shared .ledger-table th, td rules */
}
```

**Prohibited**: `#f8fafc`, `#f1f5f9`, or other cool-gray slate header backgrounds on in-scope ledger tables.

## Usage rules

1. **Token-only backgrounds** — in-scope container rules MUST use `var(--color-surface-white)`; no `#fff` shorthand (VR-001).
2. **Table headers** — ledger tables MUST use cream tint token for `th` backgrounds (VR-004).
3. **Layout vs theme** — component BEM classes MAY set layout only (padding, flex); background/border/shadow MUST come from shared container rules.
4. **Depth restraint** — do not add heavy box-shadow on top of thick borders; keep subtle elevation (FR-002).
5. **Auth deferral** — `.auth-layout__card` already satisfies contract; no TSX changes required for M5 unless spec expands.

## In-scope selector checklist (FR-001)

| Selector | Required properties | Test hook |
|----------|---------------------|-----------|
| `.block-section` | white bg, subtle border, soft shadow, `--radius-card` | `LedgerGrid.theme.test.tsx` |
| `.ledger-grid__summary` | same | `LedgerGrid.theme.test.tsx` |
| `.artist-deal-panel` | same | `LedgerGrid.theme.test.tsx` |
| `.event-card` | same (replace `#fff`) | `EventCard.theme.test.tsx`, `dataContainers.test.ts` |
| `.welcome-modal` | white bg, modal shadow | `WelcomeModal.theme.test.tsx` |
| `.ledger-table th` | `--color-bg-cream` bg | `dataContainers.test.ts` |

## Test contract

### `dataContainers.test.ts` (CSS file parse)

- Assert grouped container selectors include `var(--color-surface-white)`.
- Assert `.event-card` block does NOT contain `background: #fff`.
- Assert `.ledger-table th` block includes `var(--color-bg-cream)`.
- Assert no `#f8fafc` in `index.css` (also covered by `legacyPalette.test.ts`).

### `LedgerGrid.theme.test.tsx` (extend)

- Existing: `.block-section`, `.ledger-grid__summary`, cream page background.
- Add: `.artist-deal-panel` white surface; `.ledger-table th` cream header.

### `EventCard.theme.test.tsx` (new)

- Render `EventCard` with fixture event; assert root element has class `event-card`.
- CSS contract file validates token usage (avoid jsdom computed-style assertions).

### Regression suites (must pass unchanged behavior)

```bash
npm run test -- tests/ledger/LedgerGrid.test.tsx tests/components/dashboard/EventCard.test.tsx
npm run test -- tests/onboarding/WelcomeModal.theme.test.tsx
```

## Token reference

| Token | Role |
|-------|------|
| `--color-surface-white` | Container fill |
| `--color-bg-cream` | Workspace + table header tint |
| `--color-border-subtle` | Container border |
| `--radius-card` | 8px corner radius |
| `--shadow-soft` | Inline card depth |
| `--shadow-modal` | Modal depth |

## Related specs

- Tokens: `specs/059-mhc-design-tokens`
- Epic: `specs/058-brand-theming-mhc`
- Cream background: SPLR-86
- Buttons (parallel M4): `specs/065-shared-button-styles`
- Downstream: SPLR-91 (remaining `#fff` / legacy hex migration)
