# Contract: Festival Financials Endpoints

`FestivalFinancialsController` — revenue buckets, revenue allocations, shared-expense splits, QBO transaction mapping/exceptions. The master ledger itself (REVENUE/EXPENSES line items on the wrapper) continues to use the existing `LedgerController` endpoints unchanged.

Permissions: all mutation endpoints require `ManageAllocations` (or noted exceptions); reads of festival-wide financials require full financial visibility; scoped users (stage assignments) receive only their blocks' allocation views. Master-ledger/festival-financial reads write `MasterLedgerAccess` audit entries (D10).

## Revenue buckets

### GET /venues/{venueId}/festivals/{eventId}/buckets
200 `RevenueBucketResponse[]`: `{ id, name, isAllocable, amount, linkedLineItemId?, lockedAt?, totalAllocated, remaining }` — balances computed via SUM projection, never stored (D8).

### POST .../buckets — `{ name, amount, isAllocable?, linkedLineItemId? }` → 201; 409 duplicate name; 400 linked line item not on this wrapper/not REVENUE block.
### PUT .../buckets/{bucketId}
- 409 `BucketLockedResponse` when `LockedAt` set and caller lacks `OverrideSettlements`.
- Lowering `amount` below `totalAllocated` → 409 `AllocationConflictResponse` `{ totalAllocated, requestedAmount, overBy }`.
### DELETE .../buckets/{bucketId} → 204; 409 when allocations exist.

## Revenue allocations

### GET .../buckets/{bucketId}/allocations → 200 rows + bucket balance header
### POST .../allocations
Request `{ revenueBucketId, programmingBlockId, allocationType: FixedAmount|PercentOfBucket, percentage?|amount? }`
- 400: bucket not `IsAllocable`; block not settlement-bearing; wrong field for type.
- 200/201 `RevenueAllocationResponse` `{ ..., calculatedAmount, bucketRemaining, warnings[] }` — draft over-allocation returns `warnings: [BUCKET_OVERALLOCATED]` (allowed in draft, PRD).
- 409 when >100% and caller lacks `OverrideSettlements` (hard ceiling without override).
- Finalize re-checks `SUM ≤ amount` inside the settlement transaction (D6/D8) — this endpoint's checks are advisory-fast, the transaction check is authoritative.
### PUT .../allocations/{id} / DELETE — same validation; edits against `Finalized` block settlements → 409 (reopen flow required); all edits write before/after audit entries.

Penny-remainder behavior (D7): multi-participant percentage allocations against one bucket compute at full precision, round per line via `RoundMoney`, and assign remainder to the largest share or an explicit `RoundingAdjustment` line — response includes `roundingAdjustment?` when emitted.

## Shared-expense & transaction splits

### GET /venues/{venueId}/festivals/{eventId}/expense-allocations?sourceType=&targetType=
200 rows + per-source rollups: `{ sourceAmount, totalAllocated, remainingAtOverhead }`.

### POST .../expense-allocations
Request (exactly one source, exactly the matching target fields):
```
{ sourceLineItemId? | sourceQboTransactionId?,
  targetType: Overhead|Day|Stage|Block,
  targetDayDate? | targetStageZoneId? | targetBlockId?,
  method: Equal|Percentage|FixedAmount|ManualLine,
  percentage? | amount?,
  countsTowardSettlement? }
```
- Multi-target convenience: `targets[]` accepted for `Equal`/`Percentage` methods; server expands to lines and validates the split reconciles to 100%/full amount (PRD).
- 400: source `ReviewState ≠ None` with `countsTowardSettlement: true` (exception-state exclusion); target not in this wrapper.
- 409 `AllocationConflictResponse` when lines would exceed the source amount.
- Unallocated remainder is implicit overhead — always returned, never an error (overhead is a valid final state).

### PUT / DELETE .../expense-allocations/{id} — audit-trailed; changes touching `Finalized` settlements → 409 (adjustment/reopen flow).

## QBO transaction mapping & exceptions

Existing sync lands master-tagged transactions in `UnmappedQboTransaction` on the wrapper (no new QBO plumbing; read-only preserved — Constitution IV).

### GET /venues/{venueId}/festivals/{eventId}/qbo-transactions?reviewState=&allocationState=
200 `FestivalQboTransactionResponse[]`: original QBO reference fields + `reviewState` + `{ totalAllocated, remainingAtOverhead }` + `allocations[]` (drill-down both directions, D9/D14).

### POST .../qbo-transactions/{txId}/review
Request `{ resolution: Remap|AcceptAsOverhead|Reclassify, reason }` — requires `ManageAllocations`; clears/updates `ReviewState`; writes audit entry preserving original state + prior mapping side-by-side data. Reclassifications touching finalized settlements → 409 pointing at the adjustment/reopen flow.

## Error semantics

Typed: `ValidationException` 400, `AllocationConflictException` 409, `ConflictException` 409, `NotFoundException` 404 (cross-org always 404), `AuthorizationException` 403. No monetary values in logs beyond in-domain amounts; no PII/tokens (Constitution VIII).
