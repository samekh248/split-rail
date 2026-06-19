# Quickstart Validation Guide: Event Pin API Endpoints

**Feature**: 030-event-pin-endpoints  
**Date**: 2026-06-18

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL for integration tests)
- UserEventPin entity and migration applied (spec 029 / SPLR-69)

## Setup

### 1. Verify build

```bash
cd apps/api
dotnet build
```

### 2. Run pin integration tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~EventPinControllerTests"
```

---

## Validation Scenarios

Each scenario maps to [contracts/event-pin-api.md](./contracts/event-pin-api.md). Automated tests are the primary proof.

### Scenario 1: Pin round-trip (A1, A2, A11)

**Validates**: FR-001, FR-002, FR-011, SC-001

Integration test: `PUT /api/venues/{venueId}/events/{eventId}/pin` → 204 → verify pin row → `DELETE .../pin` → 204 → verify row removed.

**Expected**: Pin-then-unpin completes successfully; `PinnedAt` populated.

### Scenario 2: Idempotent pin/unpin (A7, A8)

**Validates**: FR-007, FR-008, SC-005

Integration test: double `PUT` → single row; `DELETE` without prior pin → 204.

**Expected**: No duplicate rows; no error on no-op unpin.

### Scenario 3: Authorization (A4)

**Validates**: FR-004, SC-006

Integration test: disable `can_view_financials` on admin role → `PUT .../pin` → 403.

**Expected**: Permission denial before service logic.

### Scenario 4: Tenant isolation (A5, A9)

**Validates**: FR-005, FR-009, SC-002

Integration test: Org A user attempts pin on Org B event id → 404.

**Expected**: No cross-org pin created; no Org B data in response.

### Scenario 5: Venue scope (A6)

**Validates**: FR-006, SC-003

Integration test: user scoped to Venue X attempts pin on event in Venue Y → 404.

**Expected**: Out-of-scope venue denied.

### Scenario 6: Per-user isolation (A3)

**Validates**: FR-003

Integration test: User A and User B both pin same event; User A unpins; User B pin remains.

**Expected**: Pins are independent per user.

### Scenario 7: Event delete cascade (A10)

**Validates**: FR-010, SC-004

Integration test: pin via API → delete event via existing `DELETE .../events/{eventId}` → zero pin rows.

**Expected**: No orphaned pins (FK cascade from spec 029).

### Scenario 8: Coverage gate (A12)

**Validates**: FR-012, SC-007

```bash
cd apps/api.tests
dotnet test --collect:"XPlat Code Coverage"
```

**Expected**: ≥80% line/branch on `EventPinService`, `EventsController` pin actions, and `EventPinControllerTests`.

---

## Out of scope (do not validate here)

- `GET /dashboard` pinned event aggregation → SPLR-72
- Frontend pin toggle wiring → SPLR-71
- New migrations or entity changes → spec 029 (complete)
- Pin UI on dashboard overview → unchanged until SPLR-71

## Related artifacts

- Entity (upstream): [../029-user-event-pin-entity/data-model.md](../029-user-event-pin-entity/data-model.md)
- API contract: [contracts/event-pin-api.md](./contracts/event-pin-api.md)
- Design decisions: [research.md](./research.md)
