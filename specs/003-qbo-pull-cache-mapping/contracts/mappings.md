# Contract: QBO Account Mappings

**Feature**: 003-qbo-pull-cache-mapping
**Base path**: `api/venues/{venueId}`
**Auth**: JWT Bearer.

Mappings are scoped at the **venue** level (not event level) because they implement self-healing routing: once a QBO account is mapped to a ledger category at a venue, all future events at that venue benefit from the mapping.

## GET `/mappings`

Lists all QBO account mappings for a venue.

- **Permission**: `can_view_financials`.
- **200 OK**:

```json
{
  "venueId": "uuid",
  "mappings": [
    {
      "id": "uuid",
      "qboAccountId": "ACC-001",
      "qboAccountName": "Sound Equipment Rental",
      "mappedCategoryLabel": "Production",
      "mappedLineItemId": "uuid-or-null",
      "createdAt": "2026-06-14T18:00:00Z"
    }
  ]
}
```

- **404 Not Found**: unknown/out-of-tenant venue.

## POST `/mappings`

Creates a new QBO account mapping for the venue. If a mapping already exists for the same `(venue_id, qbo_account_id)`, returns 409 Conflict.

- **Permission**: `can_edit_settlement` (accounting-level access).
- **Request**:

```json
{
  "qboAccountId": "ACC-001",
  "qboAccountName": "Sound Equipment Rental",
  "mappedCategoryLabel": "Production",
  "mappedLineItemId": "uuid-or-null"
}
```

- **201 Created**: the created mapping DTO (same shape as GET list items), with `Location` header.
- **409 Conflict** (`QboMappingConflictException`): mapping already exists for this `(venue_id, qbo_account_id)`.
- **400 Bad Request**: missing required fields.
- **403 Forbidden**: lacks permission.
- **404 Not Found**: unknown/out-of-tenant venue.

**Side effects**: On successful mapping creation, the system re-processes all `unmapped_qbo_transactions` at the venue matching the newly-mapped `qbo_account_id`:
1. Each matching unmapped transaction is inserted into `qbo_sync_ledger` with the `mapped_line_item_id`.
2. `qbo_actual_value` is recomputed on affected `financial_line_items`.
3. Resolved rows are deleted from `unmapped_qbo_transactions`.

## DELETE `/mappings/{mappingId}`

Removes a mapping rule. Does NOT remove or alter any `qbo_sync_ledger` entries that were previously routed through this mapping (append-only; Constitution IV).

- **Permission**: `can_edit_settlement`.
- **204 No Content**: successfully deleted.
- **403 Forbidden**: lacks permission.
- **404 Not Found**: unknown/out-of-tenant mapping.

## PUT `/mappings/{mappingId}`

Updates the target category/line-item of an existing mapping. Does NOT retroactively re-route previously-synced transactions (those remain in their original `qbo_sync_ledger` entries).

- **Permission**: `can_edit_settlement`.
- **Request**:

```json
{
  "mappedCategoryLabel": "Marketing",
  "mappedLineItemId": "uuid-or-null"
}
```

- **200 OK**: the updated mapping DTO.
- **403 Forbidden**: lacks permission.
- **404 Not Found**: unknown/out-of-tenant mapping.

## Implementation Notes

- All mapping queries are scoped by `ITenantContext.OrganizationId` via EF Core global query filters on `QboAccountMapping` (joining through `Venue.OrganizationId`).
- The unique constraint on `(venue_id, qbo_account_id)` is enforced both at the database level and checked pre-INSERT for a clear 409 error.
- The re-processing side effect on POST is wrapped in a transaction: mapping insert + unmapped re-processing + `qbo_actual_value` recomputation all succeed or all roll back.
