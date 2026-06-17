# Contract: Line-Item CRUD UI (Frontend)

**Feature**: 013-line-item-crud-ui  
**Extends**: [002-financial-ledger-grid/contracts/line-items.md](../../002-financial-ledger-grid/contracts/line-items.md) (API unchanged except permission hardening)  
**Date**: 2026-06-17

Documents the **UI component contract** and client behavior. REST shapes remain those of feature 002; monetary fields are JSON strings.

## Component hierarchy

```text
EventLedgerPage
├── LedgerGrid
│   └── BlockSection (×3: REVENUE, EXPENSES, DEAL_MATH)
│       ├── [Add row] button          ← REVENUE & EXPENSES only, when canEditStructure
│       ├── AddLineItemForm (inline/dialog, block pre-selected)
│       └── LedgerRow (×N)
│           ├── inline label edit     ← when canEditStructure
│           ├── deduction checkbox    ← EXPENSES only, when canEditStructure
│           ├── move up / move down   ← when canEditStructure & not at boundary
│           ├── delete + confirm      ← when canEditStructure
│           └── value/notes inputs    ← existing editability (unchanged)
└── (dev-only add-sample button REMOVED)
```

## Hook: `useCanEditLedgerStructure`

**Inputs**: `status`, `isBudgetLocked`, user profile permissions  
**Output**: `boolean`

```typescript
// Pseudocode — implementation uses generated types
canEditStructure =
  status === 'PRE_SHOW' &&
  (isBudgetLocked ? permissions.canEditSettlement : permissions.canViewFinancials);
```

When `false`, structural controls are not rendered (not merely disabled).

## AddLineItemForm

| Field | Planning (unlocked) | Settlement (locked) |
|-------|---------------------|---------------------|
| Block | Pre-selected from section header | Pre-selected |
| Label | Required text input | Required |
| Value | `proformaValue` input (required) | `settlementValue` input (required) |
| Proforma display | Editable | Hidden or read-only `0.00` |
| Artist deduction | Checkbox (Expenses block only) | Checkbox (Expenses only) |
| Submit | `POST …/line-items` | `POST …/line-items` with `proformaValue: "0.00"` |

**Request shape** (generated `CreateLineItemRequest`):

```json
{
  "blockType": "EXPENSES",
  "rowLabel": "Backline rental",
  "sortOrder": 3,
  "isArtistDeduction": false,
  "proformaValue": "250.00",
  "settlementValue": "0.00",
  "notes": "",
  "isHiddenFromPromoter": false
}
```

Settlement-phase create example:

```json
{
  "blockType": "EXPENSES",
  "rowLabel": "Surprise catering",
  "sortOrder": 4,
  "isArtistDeduction": true,
  "proformaValue": "0.00",
  "settlementValue": "812.50",
  "notes": "",
  "isHiddenFromPromoter": false
}
```

**Errors**: label empty → inline validation; 400/403/409 → toast/alert + ledger refetch.

## Delete flow

1. User clicks delete on row.
2. `window.confirm('Delete "{rowLabel}"? This cannot be undone.')`.
3. On confirm: `DELETE …/line-items/{id}` via `useDeleteLineItem`.
4. On success: query invalidation + auto recalc (server-side).
5. On failure: error message; grid unchanged.

## Reorder flow

1. User clicks move-up or move-down.
2. Client identifies neighbor row in same block.
3. Two `PUT …/line-items/{id}` calls swapping `sortOrder` (full payload + each row's `rowVersion`).
4. On 409: show conflict message; refetch ledger.

## Inline label / deduction edit

- **Label**: editable text input replacing static `<td>` when `canEditStructure`; blur → `PUT` with unchanged values + new label.
- **Deduction flag**: checkbox on expense rows; change → `PUT` with toggled `isArtistDeduction`.

## Test IDs (for Vitest/RTL)

| Element | `data-testid` |
|---------|---------------|
| Add row (Revenue) | `add-row-REVENUE` |
| Add row (Expenses) | `add-row-EXPENSES` |
| Add form | `add-line-item-form` |
| Row delete | `delete-row-{id}` |
| Move up | `move-up-{id}` |
| Move down | `move-down-{id}` |
| Label input | `label-edit-{id}` |
| Deduction toggle | `deduction-{id}` |

## Backend addition (permission hardening)

`LedgerService` gains structural permission validation on all line-item mutations:

| Operation | New check |
|-----------|-----------|
| POST | `ValidateLineItemStructuralEditAsync` before persist |
| PUT | Same (in addition to column validator) |
| DELETE | Same (currently missing) |

Returns **403** when permission missing; **400** when lifecycle blocks mutation.
