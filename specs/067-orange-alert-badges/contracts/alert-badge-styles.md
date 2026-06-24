# Contract: Alert and Action-Required Badge Styles (SPLR-90)

CSS class contract for Montana High Country orange pill badges. Runtime source of truth: `apps/web/src/index.css` shared badge block. Test parity: `apps/web/tests/theme/badges.test.tsx`, `badgeMigration.test.tsx`, component theme tests.

## Required CSS classes

### `.badge-action-required` / `.badge-alert` (grouped selectors)

```css
.badge-action-required,
.badge-alert {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  background: var(--color-accent-orange);
  color: var(--color-surface-white);
  border-radius: 9999px;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 700;
}
```

Context-specific spacing hooks MAY append margin rules (e.g., `.unmapped-banner .badge-action-required { margin-right: 0.5rem; }`) without overriding color, radius, or typography.

## Variance surfaces (must NOT use badge utilities)

### `.variance-cell--flagged`

```css
.variance-cell--flagged {
  background: var(--color-warning-bg);
  color: var(--color-accent-orange-hover);
  font-weight: 600;
}
```

### `.ledger-grid__variance-banner`

Warning banner tokens only — no orange pill fill:

```css
.ledger-grid__variance-banner {
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  color: var(--color-warning-text);
  /* layout: padding, radius, margin — unchanged */
}
```

### `.event-card__variance-badge` (warning-tone data chip)

After migration, MUST use warning tokens — example target:

```css
.event-card__variance-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent-orange-hover);
  background: var(--color-warning-bg);
  border-radius: 9999px;
}
```

**Must NOT** include `background: var(--color-accent-orange)` or white label text.

## Usage rules

1. **Token-only colors** — badge utility blocks MUST reference `var(--color-*)`; no brand hex literals in badge rules (FR-007).
2. **Explicit classes on FR-002/FR-003 surfaces** — TSX MUST include `badge-action-required` (or `badge-alert`) in `className` (VR-005).
3. **Layout vs theme** — component BEM classes MAY set layout (`align-self`, `margin`); color/typography MUST come from shared badge utilities.
4. **Variance exclusion** — flagged variance cells, variance banners, and event-card variance badges MUST NOT receive `badge-action-required` (FR-004, FR-005).
5. **Semantic labels** — badge text MUST remain plain language (accessible name); color is not the sole indicator.

## FR-002 / FR-003 migration matrix

| Surface | File | Change |
|---------|------|--------|
| EventCard alert chips | `EventCard.tsx` | `className="event-card__alert-chip badge-action-required"` |
| UnmappedBanner label | `UnmappedBanner.tsx` | Add `<span className="badge-action-required">` with count/label in toggle |
| Accounting workload unassigned | `AccountingWorkloadList.tsx` | Add `badge-action-required` to unassigned span |
| Accounting workload alerts | `AccountingWorkloadList.tsx` | Wrap alert labels in `<span className="badge-action-required">` |
| EventCard variance | `EventCard.tsx` | Keep `event-card__variance-badge` only — no shared orange class |
| Ledger variance cell | `VarianceCell.tsx` | No change — `variance-cell--flagged` only |
| Ledger variance banner | `LedgerGrid.tsx` | No change — banner styling only |

## Contrast contract

Add to `apps/web/src/theme/tokens.ts`:

```typescript
{
  id: 'white-on-orange-badge',
  foreground: colors.surfaceWhite,
  background: colors.accentOrange,
  minRatio: 4.5,
}
```

Validated by `apps/web/tests/theme/contrast.test.ts`.

## Test contract

| Test file | Asserts |
|-----------|---------|
| `badges.test.tsx` | Token refs, pill radius, font-size 0.75rem, weight 700, `.badge-alert` grouped |
| `badgeMigration.test.tsx` | EventCard alerts have `badge-action-required`; variance badge does not |
| `EventCard.theme.test.tsx` | Alert chips include shared class when bottleneck alerts render |
| `contrast.test.ts` | Badge white-on-orange pairing ≥4.5:1 |
| `legacyPalette.test.ts` | No migrated legacy hex in `index.css` event-card badge blocks |

## Related contracts

- Parent epic: `specs/058-brand-theming-mhc/contracts/ui-theming.md` (Alert & action-required badges section)
- Tokens: `specs/059-mhc-design-tokens/contracts/design-tokens.md`
- Buttons (adjacent M4): `specs/065-shared-button-styles/contracts/shared-button-styles.md`
