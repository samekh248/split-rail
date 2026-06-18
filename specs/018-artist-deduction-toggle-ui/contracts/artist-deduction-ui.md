# Contract: Artist Deduction Toggle UI (Frontend)

**Feature**: 018-artist-deduction-toggle-ui  
**Extends**: [013-line-item-crud-ui/contracts/line-item-crud-ui.md](../../013-line-item-crud-ui/contracts/line-item-crud-ui.md), [002-financial-ledger-grid/contracts/line-items.md](../../002-financial-ledger-grid/contracts/line-items.md)  
**Date**: 2026-06-17

Documents UI behavior for the artist-deduction flag. REST shapes unchanged; monetary fields remain JSON strings.

## Component: `LedgerRow` (Expenses block)

### Visual indication (always when flagged)

```text
<tr class="ledger-row ledger-row--deduction" data-row-id="{id}">
  <td class="ledger-row__label">
    {label or label input}
    <span class="ledger-row__deduction-badge" data-testid="deduction-badge-{id}">Deduction</span>
    {optional editable checkbox — see below}
  </td>
  ...
</tr>
```

- Badge and row class render when `row.isArtistDeduction === true` and `blockType === 'EXPENSES'`.
- Badge MUST remain visible when `canEditStructure === false` (read-only / settled view).
- Styling MUST NOT rely on color alone (border/label/text weight).

### Editable toggle (conditional)

Rendered only when `canEditStructure && blockType === 'EXPENSES'`:

```text
<label class="ledger-row__deduction">
  <input
    type="checkbox"
    checked={row.isArtistDeduction}
    data-testid="deduction-{id}"
    aria-label="Artist deduction {rowLabel}"
    onChange → onDeductionChange(id, checked)
  />
  Deduction
</label>
```

**Note**: When editable, both checkbox label and persistent badge may appear; badge provides at-a-glance state for SC-004 even while editing.

### Revenue / other blocks

No badge, no toggle, regardless of `isArtistDeduction` value on DTO (should always be false for Revenue).

## Component: `AddLineItemForm` (Expenses)

| Field | Expenses block | Revenue block |
|-------|----------------|---------------|
| Artist deduction checkbox | Shown (`data-testid="add-line-item-deduction"`) | Hidden |
| Submit payload | `isArtistDeduction: boolean` | Always `false` |

On successful create + recalculate, flagged rows MUST render with badge + row class.

## Page wiring: `EventLedgerPage`

```text
onDeductionChange(id, isArtistDeduction) →
  saveLineItemRow(id, { isArtistDeduction }) →
    PUT …/line-items/{id} (full payload + rowVersion) →
    POST …/recalculate →
    ledger query invalidation
```

On error: set `structuralError`, `refetch()` ledger (reverts controlled checkbox).

## Permission hook (unchanged from 013)

```typescript
canEditStructure =
  status === 'PRE_SHOW' &&
  (isBudgetLocked ? permissions.canEditSettlement : permissions.canViewFinancials);
```

Deduction toggle uses `canEditStructure`; badge does not.

## API payloads (generated types)

**Toggle existing row** (`UpdateLineItemRequest`):

```json
{
  "rowLabel": "Production",
  "sortOrder": 2,
  "isArtistDeduction": true,
  "proformaValue": "2000.00",
  "settlementValue": "0.00",
  "notes": "",
  "isHiddenFromPromoter": false,
  "rowVersion": "..."
}
```

**Create flagged expense** (`CreateLineItemRequest`):

```json
{
  "blockType": "EXPENSES",
  "rowLabel": "Marketing",
  "sortOrder": 5,
  "isArtistDeduction": true,
  "proformaValue": "500.00",
  "settlementValue": "0.00"
}
```

## Test IDs

| Element | `data-testid` |
|---------|---------------|
| Deduction badge | `deduction-badge-{id}` |
| Deduction toggle | `deduction-{id}` |
| Deduction row class | `tr.ledger-row--deduction` (class assertion) |
| Add-form deduction | `add-line-item-deduction` |
| Summary deductions | `ledger-summary` (contains Deductions total) |

## Backend (verification only)

No new endpoints. Optional regression test:

1. `PUT` toggles `isArtistDeduction` on expense row with known value.
2. `POST /recalculate` returns updated `summary.totalDeductions`.
