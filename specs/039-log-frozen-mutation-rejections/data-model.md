# Data Model: Explicit Audit Logging for Rejected Frozen-Event Mutations

**Feature**: 039-log-frozen-mutation-rejections  
**Date**: 2026-06-19

## Schema changes

**None.** This feature adds observability only. No database tables, columns, or migrations.

## Logical entities

### Frozen Event (existing)

An `events` row with `status` ∈ {`SETTLED`, `RECONCILED`}. Parent venue provides `venue_id`; organization resolved via `Event → Venue → OrganizationId` for tenant scoping (unchanged).

| Attribute | Source | Used in audit log |
|-----------|--------|-------------------|
| `EventId` | `events.id` | Yes |
| `VenueId` | `events.venue_id` | Yes |
| `EventStatus` | `events.status` | Yes (`SETTLED` or `RECONCILED`) |

### Immutability Rejection Audit Entry (new — log record, not persisted)

Ephemeral structured log emitted when a frozen-event mutation is blocked.

| Field | Type | Required | Sanitization |
|-------|------|----------|--------------|
| `Operation` | string (stable label) | Yes | From `FrozenEventMutationOperation` constants only |
| `EventId` | UUID | Yes | — |
| `VenueId` | UUID | Yes | — |
| `UserId` | UUID? | When authenticated | User id only; never email/name |
| `EventStatus` | enum string | Yes | `SETTLED` or `RECONCILED` |
| Log level | — | Yes | Warning |

**Prohibited in audit entry**: signature data, access/refresh tokens, client secrets, connection strings, request/response bodies, financial field values, cleartext PII.

### Attempted Operation (new — classification enum/constants)

Stable snake_case labels identifying the blocked mutation path. See [research.md §4](./research.md) for full mapping.

## Service: `FrozenEventMutationAuditor`

| Method | Input | Output | Side effects |
|--------|-------|--------|--------------|
| `RejectIfFrozen(Event evt, Guid venueId, Guid? userId, string operation)` | Event entity, venue id, optional user id, operation label | — | Emits structured Warning log; throws `LedgerStateException` with existing settled/reconciled message |

**Dependencies**: `ILogger<FrozenEventMutationAuditor>`

**Throw message** (unchanged for line-item/event metadata paths):
> "Event is settled or reconciled and cannot be modified."

**Throw message** (unchanged for artist paths — logged then thrown separately):
> "Artist configuration is only permitted while event is in PRE_SHOW status."

**Throw message** (unchanged for event delete):
> "Event is settled or reconciled and cannot be deleted."

**Throw message** (unchanged for lock budget):
> "Cannot lock budget when event is settled or reconciled."

## Mutation path inventory (audit coverage matrix)

| Service | Method | Frozen guard today | Operation label | Audit after change |
|---------|--------|-------------------|-----------------|-------------------|
| `EventService` | `UpdateEventAsync` | Inline status check | `update_event_metadata` | Yes |
| `EventService` | `DeleteEventAsync` | Inline status check | `delete_event` | Yes |
| `LedgerService` | `LockBudgetAsync` | Inline status check | `lock_budget` | Yes |
| `LedgerService` | `CreateLineItemAsync` | `AssertNotSettledOrReconciled` | `create_line_item` | Yes |
| `LedgerService` | `UpdateLineItemAsync` | `AssertNotSettledOrReconciled` | `update_line_item` | Yes |
| `LedgerService` | `DeleteLineItemAsync` | `AssertNotSettledOrReconciled` | `delete_line_item` | Yes |
| `LedgerService` | `CreateArtistAsync` | `AssertArtistEditable` | `create_artist` | Yes (Settled/Reconciled only) |
| `LedgerService` | `UpdateArtistAsync` | `AssertArtistEditable` | `update_artist` | Yes (Settled/Reconciled only) |
| `LedgerService` | `DeleteArtistAsync` | `AssertArtistEditable` | `delete_artist` | Yes (Settled/Reconciled only) |

## Excluded paths (no frozen rejection audit)

| Path | Reason |
|------|--------|
| `SettlementService.ReconcileAsync` | Sanctioned SETTLED → RECONCILED mutation |
| `SettlementService.ReverseAsync` | Sanctioned super-admin reversal |
| `SettlementService.FinalizeAsync` (already settled) | Uses `SettlementStateException`; out of scope |
| Column editability guards | Not frozen-status rejections |
| `PRE_SHOW` successful mutations | No rejection |

## State reference (unchanged)

```
PRE_SHOW ──settle──► SETTLED ──reconcile──► RECONCILED
                         │                        │
                         └── mutations blocked ───┘
                              (audit log on reject)
```
