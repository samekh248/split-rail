# Data Model: Immutability Verification After Full Settlement

**Feature**: 044-immutability-settle-coverage  
**Date**: 2026-06-20  
**Schema changes**: None

This feature adds automated verification only. The entities below are **observability and test-state concepts** — not new database tables.

## Lifecycle states under test

| State | How reached in tests | Immutability expectation |
|-------|----------------------|--------------------------|
| `PRE_SHOW` | Default after event creation | Mutations allowed |
| `SETTLED` | `SeedFinalizedEventAsync` → POST `/settle` | Standard mutation paths rejected |
| `RECONCILED` | Finalize → POST `/reconcile` | Same rejection as `SETTLED` for tested paths |

**Forbidden in new tests**: `SetEventStatusDirectAsync` / `SetSettledEventDirectAsync` for immutability scenarios added by this feature.

## Finalized event fixture (test seed)

| Field / artifact | Source after real finalize | Used in assertions |
|------------------|---------------------------|-------------------|
| `events.status` | `SETTLED` | Audit log `EventStatus` |
| `events.settlement_pdf_url` | Non-null GCS path (in-memory store path in tests) | Locate archived PDF |
| `events.settled_at` | Populated | Confirms real finalize |
| `events.artist_signature_data` | Populated | Must not appear in audit logs |
| Archived PDF bytes | `ArchiveStore.GetStoredPdf(path)` | Byte-equality before/after mutation |
| `financial_line_items` | At least one row with settlement values | Delete/update targets |
| `event_artists` | Optional second seed step | Update/delete targets |

## Blocked mutation inventory (real-finalize tests)

Aligned with specs 004, 039, and [contracts/settled-event-immutability-verification.md](./contracts/settled-event-immutability-verification.md):

| Operation label | Target entity | HTTP verb (venue-scoped) |
|-----------------|---------------|--------------------------|
| `update_event_metadata` | `events` | PATCH event |
| `delete_event` | `events` | DELETE event |
| `lock_budget` | `events` | POST lock-budget |
| `create_line_item` | `financial_line_items` | POST line-items |
| `update_line_item` | `financial_line_items` | PUT line-item |
| `delete_line_item` | `financial_line_items` | DELETE line-item |
| `create_artist` | `event_artists` | POST artists |
| `update_artist` | `event_artists` | PUT artist |
| `delete_artist` | `event_artists` | DELETE artist |
| `recalculate` | `event_artists` (payout fields) | POST recalculate |

## Sanctioned frozen-event operations (must NOT emit rejection audit)

| Operation | Expected result on finalized event | PDF bytes |
|-----------|-----------------------------------|-----------|
| QBO sync (actuals-only) | 200; `QboActualValue` may change | Unchanged |
| QBO actuals-only EF save | Success (persistence field-diff) | Unchanged |
| Settlement reversal | Super-admin only; out of scope for this feature | Original PDF preserved |

## Immutability audit entry (verification target)

When a blocked mutation is rejected, tests assert one Warning log entry per [spec 039 contract](../039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md):

| Property | Required |
|----------|----------|
| `Operation` | Matches table above |
| `EventId` | Matches seeded event |
| `VenueId` | Matches test venue |
| `UserId` | Matches authenticated financial admin |
| `EventStatus` | `SETTLED` or `RECONCILED` |

Prohibited in log text: signature payloads, tokens, raw financial amounts (reuse assertions from `FrozenEventMutationAuditTests`).

## Archived document stability invariant

```
∀ blocked mutation attempt M on finalized event E:
  bytes(archive(E)) before M == bytes(archive(E)) after M
  count(stored_pdfs for E) unchanged
```

For sanctioned QBO actuals sync:

```
bytes(archive(E)) before sync == bytes(archive(E)) after sync
∄ immutability rejection audit entry
```

## Relationships to prior specs

| Spec | Relationship |
|------|--------------|
| 004 settlement freeze | Defines mutation inventory and PDF immutability invariant |
| 039 audit logging | Defines log format and operation labels |
| 041 persistence guard | Defense-in-depth; recalculate/sync actuals paths interact here |
| 043 atomic finalize | Finalize seed must use current stage→commit→promote pipeline |
