# Verification Contract: Post-Finalize Immutability Coverage

**Feature**: 044-immutability-settle-coverage  
**Date**: 2026-06-20  
**Type**: Automated integration-test contract (not a public HTTP API change)

## Purpose

Define the verification obligations that close SPLR-39 audit gaps: immutability and archived-PDF stability must be proven on events seeded through the **real settlement finalization pipeline**, with `RECONCILED` scenarios using the **real reconcile workflow**.

Complements (does not replace):

- [spec 004](../004-settlement-freeze-archiving/spec.md) — immutability rules
- [spec 039 audit log](../039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md) — log format
- [spec 041 persistence guard](../041-ef-savechanges-interceptor/contracts/frozen-event-persistence-guard.md) — defense-in-depth

## Seeding contract

### `SETTLED` seed (mandatory for all blocked-mutation tests)

1. Create event via API.
2. Create line item(s) with settlement values; lock budget (`SeedSettlementReadyEventAsync`).
3. Optionally create artist when testing artist paths.
4. POST `/api/venues/{venueId}/events/{eventId}/settle` with valid signature.
5. Assert HTTP 200; `status = SETTLED`; exactly one archived PDF in test store.
6. Capture `originalPdfBytes` from archive store.

**Prohibited**: Direct DB/API status assignment to `SETTLED`.

### `RECONCILED` seed (mandatory for reconciled-scenario tests)

1. Complete `SETTLED` seed above.
2. POST `/api/venues/{venueId}/events/{eventId}/reconcile`.
3. Assert HTTP 200; `status = RECONCILED`.

**Prohibited**: Direct status assignment to `RECONCILED`.

## Blocked mutation verification contract

For each row, after seeding:

| # | Lifecycle | Mutation | Expected HTTP | Audit `Operation` | PDF bytes |
|---|-----------|----------|---------------|-------------------|-----------|
| 1 | SETTLED | DELETE line item | 400 | `delete_line_item` | Unchanged |
| 2 | SETTLED | PUT artist | 400 | `update_artist` | Unchanged |
| 3 | SETTLED | DELETE artist | 400 | `delete_artist` | Unchanged |
| 4 | SETTLED | POST line item | 400 | `create_line_item` | Unchanged |
| 5 | SETTLED | PUT line item | 400 | `update_line_item` | Unchanged |
| 6 | SETTLED | PATCH event metadata | 400 | `update_event_metadata` | Unchanged |
| 7 | SETTLED | DELETE event | 400 | `delete_event` | Unchanged |
| 8 | SETTLED | POST artist | 400 | `create_artist` | Unchanged |
| 9 | SETTLED | POST lock-budget | 400 | `lock_budget` | Unchanged |
| 10 | SETTLED | POST recalculate | 400 | `recalculate` | Unchanged |
| 11 | RECONCILED | PUT line item | 400 | `update_line_item` | Unchanged |
| 12 | RECONCILED | PUT artist | 400 | `update_artist` | Unchanged |
| 13 | RECONCILED | DELETE artist | 400 | `delete_artist` | Unchanged |

### Per-test assertions (all blocked paths)

1. HTTP status is **400 Bad Request** (not 500).
2. Exactly **one** Warning audit log: message contains `Rejected frozen event mutation`.
3. Structured properties: `Operation`, `EventId`, `VenueId`, `UserId`, `EventStatus`.
4. `ArchiveStore.GetStoredPdf(path)` byte-equals `originalPdfBytes`.
5. `ArchiveStore.StoredObjectCount` unchanged after mutation attempt.

## Sanctioned QBO sync verification (frozen event)

| Lifecycle | Operation | Expected HTTP | Audit rejection | PDF bytes |
|-----------|-----------|---------------|-----------------|-----------|
| SETTLED | POST `/sync` with mocked QBO returning mapped transaction | 200 | None | Unchanged |
| RECONCILED | POST `/sync` (same mock) | 200 | None | Unchanged |

Additional assertions:

- Line item `QboActualValue` may update.
- Line item `SettlementValue`, `ProformaValue`, and artist payout fields unchanged.
- No second archived PDF object created.

## Sequential mutation contract (edge case)

On one finalized event, execute blocked mutations 1→9 in sequence (each rejected). After the sequence:

- PDF bytes still equal `originalPdfBytes`.
- `StoredObjectCount == 1`.

## Environment guard

Tests requiring PDF generation MUST begin with:

```csharp
if (!IsQuestPdfSupported()) return;
```

Same convention as `SettlementImmutabilityTests` and `SettlementAtomicityTests`.

## Regression contract

Existing suites MUST remain green without modification to expected behavior:

- `FrozenEventMutationAuditTests` (helper-seeded matrix)
- `FrozenEventPersistenceGuardTests`
- `SettlementAtomicityTests`, `SettlementFinalizeTests`, `SettlementConcurrencyTests`, `SettlementReversalTests`

## Implementation mapping (reference)

| Contract area | Primary test file |
|---------------|-------------------|
| Blocked mutations + PDF + audit | `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` |
| Shared finalize seed | `IntegrationTestBase.SeedFinalizedEventAsync` |
| Recalculate guard | `LedgerService.RecalculateAsync` + `FrozenEventMutationOperation.Recalculate` |
