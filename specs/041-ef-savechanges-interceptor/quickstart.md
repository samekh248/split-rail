# Quickstart Validation Guide: Persistence-Layer Immutability Guard

**Feature**: 041-ef-savechanges-interceptor  
**Date**: 2026-06-20

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL for integration tests)
- Settlement freeze pipeline operational (spec 004)
- Frozen-event mutation auditor operational (spec 039)
- QBO actuals-on-frozen exception operational (spec 040)

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
dotnet test --filter "FullyQualifiedName~FrozenEventImmutabilityInterceptorTests|FullyQualifiedName~FrozenEventSaveContextTests"
```

### 3. Run persistence guard integration tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~FrozenEventPersistenceGuardTests"
```

### 4. Confirm existing behavior unchanged

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~SettlementImmutabilityTests|FullyQualifiedName~FrozenEventMutationAuditTests|FullyQualifiedName~ReconcileControllerTests"
```

---

## Validation Scenarios

Each scenario maps to [contracts/frozen-event-persistence-guard.md](./contracts/frozen-event-persistence-guard.md).

### Scenario 1: Persistence bypass blocked on SETTLED line item (P1)

**Validates**: FR-001, FR-003, FR-012, SC-001

Integration test flow:
1. Seed event, lock budget, finalize → `SETTLED`.
2. Open DbContext, attach line item, change `SettlementValue` directly (no `LedgerService`).
3. Call `SaveChangesAsync` → expect `LedgerStateException`.
4. Reload line item → value unchanged.
5. Assert Warning audit log: `Operation=persistence_update_line_item`, matching `EventId`, `VenueId`, `EventStatus=SETTLED`.

**Expected**: Save rejected at persistence layer; audit entry emitted.

### Scenario 2: QBO actuals-only update succeeds on frozen event (P1)

**Validates**: FR-006, FR-013, SC-002

Integration test flow:
1. Settle event → `SETTLED`.
2. Invoke QBO sync or call `RecomputeActualsForEventAsync` directly.
3. Save succeeds; `QboActualValue` updated; `SettlementValue` unchanged.
4. No immutability rejection audit entry.

**Expected**: Field-diff permits narrow actuals refresh.

### Scenario 3: Settlement reversal succeeds with authorized context (P1)

**Validates**: FR-007, FR-007a, SC-002

Integration test flow:
1. Settle event as super-admin.
2. `POST .../reverse` with reason → event returns to `PRE_SHOW`.
3. Original `settlement_pdf_url` preserved in WORM storage.

**Expected**: Authorized save context permits reversal fields.

### Scenario 4: Reconcile succeeds with authorized context (P1)

**Validates**: FR-005, FR-007a, SC-002

Integration test flow:
1. Settle event → `POST .../reconcile` → `RECONCILED`.
2. No persistence rejection.

**Expected**: Reconciliation status transition permitted.

### Scenario 5: Finalize PRE_SHOW event not blocked (P1)

**Validates**: FR-008, FR-014, SC-003

Integration test flow:
1. `PRE_SHOW` event with locked budget and actuals.
2. Finalize settlement via API → `SETTLED` with PDF.

**Expected**: Source status not frozen; persistence guard inactive.

### Scenario 6: Mixed actuals + snapshot change rejected (P1)

**Validates**: FR-006 edge case, SC-001

Unit or integration test:
1. On frozen event, modify both `QboActualValue` and `SettlementValue` in same save.
2. Entire save rejected.

**Expected**: Field-diff does not permit mixed changes.

### Scenario 7: Out-of-scope QBO ledger insert unaffected (P2)

**Validates**: FR-001 scope, clarification Q3

Integration test flow:
1. Settled event with QBO sync inserting `qbo_sync_ledger` rows + updating actuals.
2. Save succeeds.

**Expected**: Ledger inserts not evaluated by interceptor.

---

## Coverage gate

```bash
cd apps/api.tests
dotnet test --collect:"XPlat Code Coverage" --filter "FullyQualifiedName~FrozenEvent"
```

Verify ≥80% line/branch coverage on touched backend files per Constitution III.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| QBO sync fails on SETTLED event | Field-diff too strict — verify only `QboActualValue`/`UpdatedAt` change |
| Reversal fails with persistence error | Missing `Authorize(SettlementReversal)` wrapper around save |
| Finalize blocked | Interceptor using current status instead of original — check `OriginalValues` |
| No audit log on bypass rejection | Interceptor not calling `FrozenEventMutationAuditor` |
