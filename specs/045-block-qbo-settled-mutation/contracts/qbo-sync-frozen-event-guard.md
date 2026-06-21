# Contract: QBO Sync Frozen-Event Write Guard

**Feature**: 045-block-qbo-settled-mutation  
**Date**: 2026-06-20  
**Type**: Internal service behavior + HTTP error mapping (not a new public API)

## Purpose

Define the write-permission contract for `QboSyncService` recompute and persistence-layer enforcement when the target event is frozen (`SETTLED` or `RECONCILED`).

## Scope

Applies to:
- `QboSyncService.RecomputeActualsForEventAsync`
- `QboSyncService.ProcessTransactionsAsync` (caller of recompute)
- `FrozenEventImmutabilityInterceptor.ValidateLineItemEntry` (defense-in-depth)

Does **not** apply to:
- QuickBooks Online HTTP calls (remain read-only per Constitution IV)
- Sanctioned lifecycle transitions (finalize, reconcile, reversal) via `IFrozenEventSaveContext`
- Direct ledger CRUD via `LedgerService` (existing guards)

## Write matrix

| Parent event status | `qbo_sync_ledgers` ingest | `financial_line_items.QboActualValue` | Settlement snapshot fields |
|---------------------|---------------------------|---------------------------------------|----------------------------|
| `PRE_SHOW` | Allow | Allow | Allow |
| `SETTLED` | Allow | **Deny** | **Deny** |
| `RECONCILED` | Allow | **Allow** | **Deny** |

## Service-layer guard (`RecomputeActualsForEventAsync`)

### Preconditions

1. Resolve event by `eventId` within current sync transaction scope.
2. Read `event.Status`.

### Behavior

| Status | New QBO transactions ingested | Behavior |
|--------|------------------------------|----------|
| `PRE_SHOW` | Any | Recompute all mapped line items (existing) |
| `SETTLED` | None | Skip recompute; return success |
| `SETTLED` | ≥1 (would change actuals) | **Reject** before modifying line items |
| `RECONCILED` | Any | Recompute actuals only (`QboActualValue`, `UpdatedAt`) |

### Rejection emission

When rejecting:
1. Call `FrozenEventMutationAuditor.RejectIfFrozen(event, venueId, userId, "qbo_sync_recompute")`
2. Throw `LedgerStateException` (existing message: "Event is settled or reconciled and cannot be modified.")
3. Do not commit partial line-item changes (guard runs before mutation loop)

### Success on RECONCILED

- Only `QboActualValue` and `UpdatedAt` may differ after SaveChanges.
- Archived settlement PDF must not be regenerated.

## HTTP mapping (existing endpoints)

| Endpoint | SETTLED + new txn | RECONCILED + new txn | SETTLED + no new txn |
|----------|-------------------|----------------------|----------------------|
| `POST /venues/{venueId}/events/{eventId}/qbo/sync` | **400** `ledger_state` | **200** + updated actuals | **200** |
| Venue batch sync | Per-event failure entry | Per-event success | Per-event success |

No response schema changes.

## Persistence interceptor alignment

`IsOnlyQboActualsUpdate(entry)` returns `true` (permit save) **only when**:
1. Entry state is `Modified`
2. Only `QboActualValue` and/or `UpdatedAt` are modified
3. Parent event status is **`RECONCILED`**

For parent status `SETTLED`, modified line items → reject with `persistence_update_line_item` or `qbo_sync_recompute` depending on call path.

## Audit log (extends spec 039)

**Operation**: `qbo_sync_recompute`  
**Trigger**: Service guard rejection on SETTLED recompute attempt  
**Log level**: Warning  
**Template**: Unchanged from [frozen-event-mutation-audit-log.md](../../039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md)

## Verification obligations

| ID | Scenario | Expected |
|----|----------|----------|
| V-001 | Sync SETTLED event with new mapped txn | HTTP 400; audit `qbo_sync_recompute`; snapshot fields unchanged |
| V-002 | Sync SETTLED event with no new txn | HTTP 200; all line item fields unchanged |
| V-003 | Sync RECONCILED event with new mapped txn | HTTP 200; only `QboActualValue` changed; snapshot fields unchanged |
| V-004 | Sync RECONCILED event | Archived PDF bytes identical post-sync |
| V-005 | Venue batch with mixed PRE_SHOW + SETTLED | PRE_SHOW succeeds; SETTLED fails independently |

## Prohibited side effects

- Regenerating or overwriting `settlement_pdf_url` object
- Modifying `SettlementValue`, `ProformaValue`, or line-item metadata via sync
- Silent skip when new transactions would alter SETTLED line items (must reject loudly)
