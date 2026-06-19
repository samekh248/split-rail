# Quickstart Validation Guide: Explicit Audit Logging for Rejected Frozen-Event Mutations

**Feature**: 039-log-frozen-mutation-rejections  
**Date**: 2026-06-19

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL for integration tests)
- Settlement freeze pipeline operational (spec 004)
- Reconcile endpoint operational (spec 033) — for RECONCILED-state test scenarios

## Setup

### 1. Verify build

```bash
cd apps/api
dotnet build
```

No migration required for this feature.

### 2. Run unit tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~FrozenEventMutationAuditorTests"
```

### 3. Run integration audit tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~FrozenEventMutationAuditTests"
```

### 4. Confirm existing immutability tests still pass

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~SettlementImmutabilityTests"
```

---

## Validation Scenarios

Each scenario maps to [contracts/frozen-event-mutation-audit-log.md](./contracts/frozen-event-mutation-audit-log.md).

### Scenario 1: SETTLED line-item mutation rejection with audit log (P1)

**Validates**: FR-001, FR-002, FR-003, SC-001

Integration test flow:
1. Seed event, lock budget, finalize settlement → `SETTLED`.
2. Attempt `PUT .../line-items/{id}` with changed settlement value.
3. Assert HTTP 400 (unchanged behavior).
4. Assert captured Warning log contains `Operation=update_line_item`, matching `EventId`, `VenueId`, `UserId`, `EventStatus=SETTLED`.
5. Assert log text does not contain signature data or request body values.

**Expected**: Rejection + structured audit entry.

### Scenario 2: RECONCILED event mutation rejection with audit log (P1)

**Validates**: FR-011, SC-001

Integration test flow:
1. Seed SETTLED event → `POST .../reconcile` → `RECONCILED`.
2. Attempt line-item update → 400.
3. Assert audit log with `EventStatus=RECONCILED`.

**Expected**: Same audit contract applies post-reconciliation.

### Scenario 3: Event metadata update on SETTLED event (P1)

**Validates**: FR-004, SC-001

Integration test: settle event → `PUT .../events/{eventId}` with new title → 400 + audit log with `Operation=update_event_metadata`.

**Expected**: EventService path covered.

### Scenario 4: Artist update on SETTLED event (P1)

**Validates**: FR-004, FR-008, SC-001

Integration test: settle event → `PUT .../artists/{artistId}` → 400 with **existing** artist error message + audit log with `Operation=update_artist`.

**Expected**: User-facing message unchanged; audit log added.

### Scenario 5: No false-positive audit on PRE_SHOW mutation (P1)

**Validates**: FR-009, SC-005

Integration test: on `PRE_SHOW` event with budget unlocked, create line item → 201/200 success → assert no frozen-mutation audit log entries in collector.

**Expected**: Zero false positives.

### Scenario 6: Log sanitization (P1)

**Validates**: FR-005, FR-006, FR-007, SC-002

Unit test: invoke auditor with event context; assert log output contains required IDs only. Integration test: attempt mutation with signature-like strings in unrelated fields; assert log does not echo payload.

**Expected**: 0 prohibited fields in captured logs.

### Scenario 7: Auditor unit behavior (P2)

**Validates**: FR-010

Unit tests:
- `RejectIfFrozen` on SETTLED event → throws `LedgerStateException` + emits Warning.
- `RejectIfFrozen` on PRE_SHOW event → no throw, no log.

**Expected**: Central guard behavior isolated from HTTP layer.

---

## Manual smoke test (optional)

1. Run API locally with console logging enabled.
2. Settle an event via the UI or API.
3. Attempt to edit a line item.
4. Confirm console shows Warning with event/venue/user/operation fields.
5. Confirm no signature or token strings appear in the log line.

---

## Coverage gate

```bash
cd apps/api.tests
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura
```

Verify ≥80% line/branch coverage on touched backend files (`FrozenEventMutationAuditor`, modified `LedgerService`/`EventService` guard paths). Frontend coverage N/A (no changes).
