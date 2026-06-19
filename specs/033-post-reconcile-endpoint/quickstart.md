# Quickstart Validation Guide: Post-Show Event Reconciliation Transition

**Feature**: 033-post-reconcile-endpoint  
**Date**: 2026-06-18

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL for integration tests)
- Settlement lifecycle and dashboard aggregate APIs operational (specs 004, 031)

## Setup

### 1. Apply migration and verify build

```bash
cd apps/api
dotnet ef database update
dotnet build
```

### 2. Run reconcile integration tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~ReconcileControllerTests"
```

---

## Validation Scenarios

Each scenario maps to [contracts/reconcile-api.md](./contracts/reconcile-api.md). Automated tests are the primary proof.

### Scenario 1: Happy path reconcile (R1, R8)

**Validates**: FR-001, FR-007, SC-001

Integration test: seed event as `SETTLED` → `POST /api/venues/{venueId}/events/{eventId}/reconcile` → 200 → verify `status: RECONCILED`, `reconciledAt` and `reconciledByUserId` populated → `GET .../events/{eventId}` confirms metadata.

**Expected**: Single-action transition with persisted audit fields.

### Scenario 2: Invalid lifecycle states (R2, R3)

**Validates**: FR-002, SC-002

Integration tests:
- Pre-Show event → reconcile → 400
- Already Reconciled event → reconcile → 400

**Expected**: Status unchanged; clear error response.

### Scenario 3: Authorization (R4)

**Validates**: FR-003

Integration test: disable `can_trigger_qbo_sync` on admin role → reconcile → 403.

**Expected**: Permission denial before service logic.

### Scenario 4: Tenant isolation (R5, R7)

**Validates**: FR-004, FR-006, SC-003

Integration test: Org A user attempts reconcile on Org B event → 404.

**Expected**: No cross-org state change; no Org B data leaked.

### Scenario 5: Venue scope (R6)

**Validates**: FR-005

Integration test: user scoped to Venue X attempts reconcile on event in Venue Y → 404.

**Expected**: Out-of-scope venue denied.

### Scenario 6: Settlement immutability preserved (R10, R11)

**Validates**: FR-008, FR-009, SC-004

Integration test: reconcile settled event → verify `settledAt` and `settlementPdfAvailable` unchanged → attempt line-item POST → 400.

**Expected**: Financial snapshot untouched; post-reconcile mutations blocked.

### Scenario 7: Dashboard propagation (R9)

**Validates**: FR-007, SC-005

Integration test: reconcile event → `GET /api/venues/{venueId}/dashboard` → find event in appropriate partition with `status: RECONCILED` and reconciliation metadata.

**Expected**: Dashboard distinguishes reconciled from merely settled events.

### Scenario 8: Coverage gate (R13)

**Validates**: FR-012, SC-006

```bash
cd apps/api.tests
dotnet test --collect:"XPlat Code Coverage"
```

**Expected**: ≥80% line/branch on `SettlementService.ReconcileAsync`, `SettlementController` reconcile action, DTO mappers, and `ReconcileControllerTests`.

---

## Out of scope (do not validate here)

- Post-Show dashboard quick-link UI wiring → separate frontend feature
- Automatic reconcile after QBO sync → deferred milestone
- Reconcile reversal / undo → not in v1
- Frontend component or Vitest changes → backend-only per clarification

## Related artifacts

- API contract: [contracts/reconcile-api.md](./contracts/reconcile-api.md)
- Schema: [data-model.md](./data-model.md)
- Design decisions: [research.md](./research.md)
- Upstream settlement lifecycle: [../004-settlement-freeze-archiving/spec.md](../004-settlement-freeze-archiving/spec.md)
- Dashboard DTO surface: [../031-dashboard-aggregate-api/contracts/dashboard-api.md](../031-dashboard-aggregate-api/contracts/dashboard-api.md)
