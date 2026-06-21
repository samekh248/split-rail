# Data Model: Persistence-Layer Immutability Guard for Frozen Events

**Feature**: 041-ef-savechanges-interceptor  
**Date**: 2026-06-20

## Schema changes

**None.** This feature adds a persistence interceptor and save-context service. No database tables, columns, or migrations.

## Guarded entities (in scope)

Only these EF entities are evaluated by `FrozenEventImmutabilityInterceptor`:

| Entity | Table | Parent event resolution |
|--------|-------|-------------------------|
| `Event` | `events` | Self — use `OriginalValues.Status` |
| `EventArtist` | `event_artists` | `EventId` → load parent `events.status` from DB |
| `FinancialLineItem` | `financial_line_items` | `EventId` → load parent `events.status` from DB |

All other entities (`QboSyncLedger`, `SettlementReversal`, `User`, `Venue`, etc.) are **explicitly out of scope**.

## Frozen event determination

An event is **frozen** when `status ∈ { SETTLED, RECONCILED }`.

| Evaluation context | Status source |
|--------------------|---------------|
| `Event` entry being modified/deleted | `entry.OriginalValues[nameof(Event.Status)]` |
| Child entity (`EventArtist`, `FinancialLineItem`) | Database lookup: `events.status WHERE id = entity.EventId` |

**Finalize exception**: When `Event.OriginalValues.Status = PRE_SHOW` and save transitions to `SETTLED`, the event is **not frozen at source** — entire save permitted (including child snapshot updates in same transaction).

## Snapshot vs. mutable fields

### `FinancialLineItem` (frozen parent event)

| Field | Snapshot (immutable) | QBO actuals exception |
|-------|---------------------|----------------------|
| `ProformaValue` | Yes | No |
| `SettlementValue` | Yes | No |
| `BlockType`, `RowLabel`, `SortOrder` | Yes | No |
| `IsArtistDeduction`, `Notes`, `IsHiddenFromPromoter` | Yes | No |
| `EventId` | Yes | No |
| `QboActualValue` | No | **Yes** — may update |
| `UpdatedAt` | No | **Yes** — may update alongside actuals recompute |

### `Event` (original status frozen)

All fields immutable except when **authorized save context** matches:

| Authorized reason | Permitted changes |
|-------------------|-------------------|
| `SettlementReversal` | `Status → PRE_SHOW`, `SettlementPdfUrl → null` (+ reversal audit row in out-of-scope table) |
| `EventReconciliation` | `Status → RECONCILED`, `ReconciledAt`, `ReconciledByUserId` |

All other event field mutations when original status is frozen: **blocked**.

### `EventArtist` (frozen parent event)

All fields immutable. `Added`, `Modified`, `Deleted`: **blocked**.

## Service: `IFrozenEventSaveContext`

| Member | Type | Description |
|--------|------|-------------|
| `CurrentReason` | `FrozenEventSaveReason?` | Active authorization, null if none |
| `Authorize(reason)` | `IDisposable` | Enter sanctioned save scope; cleared on dispose |

### `FrozenEventSaveReason` enum

| Value | Set by | Permits |
|-------|--------|---------|
| `SettlementReversal` | `SettlementService.ReverseAsync` | Frozen event reversal field changes |
| `EventReconciliation` | `SettlementService.ReconcileAsync` | SETTLED → RECONCILED transition |

## Interceptor: `FrozenEventImmutabilityInterceptor`

| Hook | Behavior |
|------|----------|
| `SavingChanges` / `SavingChangesAsync` | Scan in-scope entries; reject disallowed changes before base implementation |

**Dependencies**: `IFrozenEventSaveContext`, `FrozenEventMutationAuditor`, `ITenantContext`, `ILogger<FrozenEventImmutabilityInterceptor>`

**Rejection flow**:
1. Classify violation → derive operation label (`persistence_*`)
2. Resolve `EventId`, `VenueId`, `EventStatus`, `UserId?`
3. Call `FrozenEventMutationAuditor.RejectIfFrozen(...)` → Warning log + `LedgerStateException`
4. Entire save aborted (EF default — exception propagates)

## Operation labels (extensions to `FrozenEventMutationOperation`)

| Constant | Trigger |
|----------|---------|
| `persistence_update_event` | Blocked `Event` modification |
| `persistence_delete_event` | Blocked `Event` deletion |
| `persistence_create_line_item` | Blocked line item insert on frozen event |
| `persistence_update_line_item` | Blocked line item update (non-actuals) |
| `persistence_delete_line_item` | Blocked line item delete |
| `persistence_create_artist` | Blocked artist insert |
| `persistence_update_artist` | Blocked artist update |
| `persistence_delete_artist` | Blocked artist delete |

## Sanctioned path inventory (must NOT trigger persistence rejection)

| Path | Mechanism |
|------|-----------|
| `SettlementService.FinalizeAsync` | Original event status `PRE_SHOW` |
| `SettlementService.ReverseAsync` | `Authorize(SettlementReversal)` |
| `SettlementService.ReconcileAsync` | `Authorize(EventReconciliation)` |
| `QboSyncService.RecomputeActualsForEventAsync` | Field-diff: only `QboActualValue` + `UpdatedAt` |
| Standard API mutations on `PRE_SHOW` events | Parent/original status not frozen |
| `QboSyncLedger` inserts during sync | Out of interceptor scope |

## Excluded from persistence rejection audit

Same as spec 039 — successful saves emit no rejection audit. Authorized saves emit no rejection audit.

## State reference

```
PRE_SHOW ──finalize──► SETTLED ──reconcile──► RECONCILED
    │                      │                        │
    │                      └── persistence guard ───┘
    │                           (blocks bypass saves)
    └── editable (guard inactive at source)
```
