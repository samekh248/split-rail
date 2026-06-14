# Contract: Line Item CRUD

**Feature**: 002-financial-ledger-grid
**Base path**: `api/venues/{venueId}/events/{eventId}/line-items`
**Auth**: JWT Bearer. Monetary fields are JSON strings.

All mutations are **state-gated**: rejected with **400** (`LedgerStateException`) when `event.status ∈ {SETTLED, RECONCILED}`. Editing `proforma_value` requires `is_budget_locked = false`; editing `settlement_value` requires `can_edit_settlement` + `is_budget_locked = true` + `status = PRE_SHOW`. Successful writes auto-trigger recalculation.

## POST `/line-items`

Create a row in an editable state.

- **Permission**: state-dependent (see above; creating/editing a proforma row needs an editable proforma; otherwise `can_edit_settlement`).
- **Request**:

```json
{
  "blockType": "EXPENSES",
  "rowLabel": "Catering",
  "sortOrder": 2,
  "isArtistDeduction": true,
  "proformaValue": "750.00",
  "settlementValue": "0.00",
  "notes": "Green room rider"
}
```

- **201 Created**: the created row DTO (incl. `id`, `variance`, `rowVersion`).
- **400 Bad Request**: invalid `blockType`, or event is `SETTLED`/`RECONCILED`, or column not editable in current state.
- **403 Forbidden**: missing required permission.
- **404 Not Found**: unknown/out-of-tenant event.

## PUT `/line-items/{id}`

Update values, label, flags, or notes. Requires the caller-supplied `rowVersion` for optimistic concurrency.

- **Permission**: state-dependent per column being changed.
- **Request**:

```json
{
  "rowLabel": "Catering (final)",
  "sortOrder": 2,
  "isArtistDeduction": true,
  "proformaValue": "800.00",
  "settlementValue": "812.50",
  "notes": "Actual invoice",
  "rowVersion": "AAAAAAAAB9E="
}
```

- **200 OK**: updated row DTO with new `rowVersion`.
- **400 Bad Request**: state/editability violation.
- **403 Forbidden**: missing permission.
- **404 Not Found**: unknown row/event or out-of-tenant.
- **409 Conflict** (`ConcurrencyConflictException`): stale `rowVersion`; client must refetch and retry.

## DELETE `/line-items/{id}`

Remove a row (only in an editable state).

- **Permission**: state-dependent.
- **204 No Content**.
- **400 Bad Request**: event `SETTLED`/`RECONCILED`.
- **404 Not Found**: unknown row/event or out-of-tenant.

**Field rules**:
- `qboActualValue` is **never** accepted on create/update (read-only; ignored or 400 if supplied).
- `isHiddenFromPromoter` may be set by users with `can_view_financials` management; default `false`.
