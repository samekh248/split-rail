# Contract: Artist Formula Preview & Edit UI (Frontend)

**Feature**: 019-artist-formula-preview  
**Extends**: [002-financial-ledger-grid/contracts/artists.md](../../002-financial-ledger-grid/contracts/artists.md)  
**Date**: 2026-06-17

Documents UI behavior for artist edit, reorder, live preview, and token insertion. REST shapes unchanged except server-side permission enforcement on existing artist routes; monetary fields remain JSON strings.

## Permission hook (column-aware)

```typescript
canEditStructure =
  status === 'PRE_SHOW' &&
  (isBudgetLocked ? permissions.canEditSettlement : permissions.canViewFinancials);
```

Passed from `EventLedgerPage` to `ArtistDealPanel`. When `false`: hide add form, Edit, Remove, reorder, and token buttons; show saved payout values in list.

## Component: `ArtistDealPanel`

### Artist list row

```text
<li data-testid="artist-row-{id}">
  <strong>{artistName}</strong> — {dealType}
  · Payout: <span data-testid="payout-{id}">{formatMoney(calculatedNetPayout)}</span>
  {canEditStructure && (
    <>
      <button data-testid="edit-artist-{id}">Edit</button>
      <button data-testid="move-artist-up-{id}" disabled={!canMoveUp}>↑</button>
      <button data-testid="move-artist-down-{id}" disabled={!canMoveDown}>↓</button>
      <button data-testid="remove-artist-{id}">Remove</button>
    </>
  )}
</li>
```

### Shared bottom form (`data-testid="artist-add-form"`)

| Mode | Primary action `data-testid` | Behavior |
|------|------------------------------|----------|
| `add` | `add-artist-btn` | `POST /artists` via `onAddArtist` |
| `edit` | `save-artist-btn` | `PUT /artists/{id}` via `onUpdateArtist` + `rowVersion` |

Fields (unchanged test IDs): `artist-name-input`, `deal-type-select`, `base-guarantee-input`, `backend-percent-input`, `tax-percent-input`, `formula-editor` (when `dealType === 'custom'`).

**Cancel** (`data-testid="cancel-artist-btn"`): clears form to add mode; reverts unsaved fields.

**Unsaved switch**: If form dirty and user clicks another Edit or attempts add-mode reset → confirmation prompt; confirm discards and switches; cancel keeps current edit.

### Live preview (in form)

```text
<div data-testid="payout-preview">
  {error ? <p data-testid="payout-preview-error">{error}</p> : <span>{formatMoney(payout)}</span>}
</div>
```

- Updates on any deal-field or formula change (synchronous client preview).
- On invalid custom formula: show `payout-preview-error`; do not show numeric payout.
- Uses `ledger.summary.grossRevenue` and `ledger.summary.totalDeductions` from parent props.

## Component: `FormulaEditor`

### Token insertion controls

```text
<button
  type="button"
  data-testid="token-insert-{TokenName}"
  disabled={disabled}
  onClick → insertToken(TokenName)
>
  {TokenName}
</button>
```

Tokens: `GrossRevenue`, `TotalDeductions`, `BaseGuarantee`, `SplitPercentage`.

Insertion rules:
- If textarea focused: insert at `selectionStart`–`selectionEnd`.
- If not focused: append to end of expression.
- After insert: call `onChange` with new expression; preview recalculates.

Legacy `data-testid="token-{name}"` on list items may remain on wrapper for tests; interactive control is `token-insert-{name}`.

## Page wiring: `EventLedgerPage`

```text
onUpdateArtist(body) →
  useUpdateArtist.mutateAsync({ id, ...body, rowVersion }) →
  POST /recalculate →
  invalidate ledger query →
  clear form to add mode

onReorderArtist(id, direction) →
  swap performanceOrder via two PUTs (reorderArtists) →
  POST /recalculate →
  on error: refetch + structuralError

onAddArtist (existing) → create + recalculate
```

Formula 422 on save: set `formulaError` message on panel (existing pattern).

## API payloads (generated types)

**Update artist** (`UpdateArtistRequest`):

```json
{
  "artistName": "The Headliner",
  "performanceOrder": 1,
  "dealType": "guarantee",
  "customFormulaExpression": null,
  "baseGuarantee": "5000.00",
  "backendPercentage": "70.00",
  "taxWithholdingPercentage": "10.00",
  "rowVersion": "..."
}
```

**Reorder** (two PUTs swapping `performanceOrder` only; all other fields from current DTO).

## Backend permission (new enforcement)

Artist `POST` / `PUT` / `DELETE` MUST call the same structural-edit permission check as line-item structure mutations:

| Budget locked | Required permission |
|---------------|---------------------|
| false | `can_view_financials` |
| true | `can_edit_settlement` |

Returns **403** when missing (in addition to existing **400** for non-`PRE_SHOW`).

## Test IDs summary

| Element | `data-testid` |
|---------|---------------|
| Artist panel | `artist-deal-panel` |
| Artist row | `artist-row-{id}` |
| Edit | `edit-artist-{id}` |
| Reorder up/down | `move-artist-up-{id}`, `move-artist-down-{id}` |
| Save (edit mode) | `save-artist-btn` |
| Cancel | `cancel-artist-btn` |
| Payout preview | `payout-preview`, `payout-preview-error` |
| Token insert | `token-insert-{TokenName}` |
| Saved payout (list) | `payout-{id}` |

## Library: `dealMathPreview`

```typescript
previewNetPayout(input: {
  dealType: DealType;
  baseGuarantee: string;
  backendPercentage: string;
  taxWithholdingPercentage: string;
  customFormulaExpression?: string | null;
  grossRevenue: string;
  totalDeductions: string;
}): { payout: string } | { error: string };
```

Must mirror server semantics in [artists.md](../../002-financial-ledger-grid/contracts/artists.md) deal math table.
