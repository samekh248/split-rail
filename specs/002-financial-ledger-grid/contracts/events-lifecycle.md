# Contract: Event Lifecycle (Lock Budget)

**Feature**: 002-financial-ledger-grid
**Base path**: `api/venues/{venueId}/events/{eventId}`
**Auth**: JWT Bearer.

This feature owns the **Lock Budget** transition. Transitions into `SETTLED` (settlement signature feature) and `RECONCILED` (QBO sync feature) are out of scope; this feature only enforces their read-only/rejection behavior.

> Event creation/listing may be provided by a separate events feature. This contract documents the lifecycle action required by the ledger. If event create/list is needed here, it follows the same `api/venues/{venueId}/events` nesting and org/venue scoping; see Implementation Notes.

## POST `/lock-budget`

Locks the proforma column: sets `is_budget_locked = true` while remaining in `PRE_SHOW`. After locking, proforma cells are read-only and settlement cells become editable (for users with `can_edit_settlement`).

- **Permission**: `can_lock_budget`.
- **Request**: empty body.
- **200 OK**: updated event DTO:

```json
{
  "eventId": "uuid",
  "venueId": "uuid",
  "title": "Friday Headliner",
  "eventDate": "2026-07-04",
  "status": "PRE_SHOW",
  "isBudgetLocked": true,
  "qboTagName": "EVENT-2026-07-04",
  "editability": { "proforma": "read-only", "settlement": "editable", "qboActuals": "locked" }
}
```

- **400 Bad Request** (`LedgerStateException`): event is not in `PRE_SHOW` (already `SETTLED`/`RECONCILED`), or already locked (idempotency: return 400 or 200 with current state — implementation returns **200** if already locked to keep the action idempotent).
- **403 Forbidden**: lacks `can_lock_budget`.
- **404 Not Found**: unknown/out-of-tenant event.

## Editability matrix (authoritative; mirrored in `GET /ledger` `editability`)

| State | status | is_budget_locked | Proforma | Settlement | QBO Actuals |
|-------|--------|------------------|----------|------------|-------------|
| Planning | PRE_SHOW | false | editable | locked | locked |
| Budget locked | PRE_SHOW | true | read-only | editable (`can_edit_settlement`) | locked |
| Settled | SETTLED | true | read-only | read-only | read-only |
| Reconciled | RECONCILED | true | read-only | read-only | auto-populated (read-only) |

## Implementation Notes

- All lifecycle/mutation handlers prepend the state-validation guard (Constitution V): if `status ∈ {SETTLED, RECONCILED}` → throw `LedgerStateException` → HTTP 400 via existing `ExceptionHandlerMiddleware`.
- Permission enforcement uses the existing `[RequirePermission(PermissionNames.LockBudget)]` / `PermissionNames.EditSettlement` / `PermissionNames.ViewFinancials` attributes and policies already registered in `Program.cs`.
- `settled_at` / `settled_by_user_id` are populated by the separate settlement feature, not here.
