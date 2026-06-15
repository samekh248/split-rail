# Contract: Reverse Settlement (super-admin, audited)

The single sanctioned exit from a frozen (`SETTLED`) state. Re-opens the event for correction while preserving the original immutable PDF.

## Endpoint

```
POST /api/venues/{venueId}/events/{eventId}/reverse-settlement
```

- **Auth**: Bearer JWT required.
- **Permission**: `can_reverse_settlement` (`RequirePermission(PermissionNames.ReverseSettlement)`) — granted to Admin by default.
- **Scope**: caller must have access to `{venueId}` within their authenticated organization.

## Request body

```jsonc
{
  "reason": "Ticket count corrected after box-office reconciliation"
}
```

DTO `ReverseSettlementRequest(string Reason)`.

## Responses

| Status | Body | When |
|--------|------|------|
| `200 OK` | `SettlementResultDto` | Reversal succeeded; event back to `PRE_SHOW` (budget still locked) |
| `400 Bad Request` | `ErrorResponse` (`validation` / `ledger_state`) | Empty reason, or event not in `SETTLED` state |
| `403 Forbidden` | `ErrorResponse` (`authorization`) | Missing `can_reverse_settlement` |
| `404 Not Found` | `ErrorResponse` (`not_found`) | Event/venue not found or out of tenant scope |

## Behavior

1. Resolve tenant + venue scope; load tracked event.
2. Validate `status == SETTLED` and non-empty `reason`. Else → 400.
3. Write a `settlement_reversals` audit row: `event_id`, `reversed_by_user_id` (caller), `reason`, `previous_pdf_url` (current `settlement_pdf_url`), `reversed_at`.
4. Transition `status = PreShow` (keep `is_budget_locked = true`); clear `settlement_pdf_url` (the event no longer has a *current* settlement) — **the GCS object is NOT deleted or overwritten** (WORM + referenced by the audit row).
5. Commit.

A subsequent finalize produces a **new** `settlementId`/object; the original remains retrievable for its 7-year retention via the audit trail.

## Test assertions

- `403` for a role lacking `can_reverse_settlement` (including a role that has `can_sign_settlement` but not reversal).
- `200` for super-admin: event returns to `PRE_SHOW` (budget locked), an audit row exists with the previous PDF URL, and the original stored PDF object is **unchanged** (byte-identical, not re-rendered).
- `400` when reversing a non-`SETTLED` event or with an empty reason.
- After reversal, the event is editable again (settlement column) and can be re-settled, producing a distinct second object.
