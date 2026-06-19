# Quickstart Validation Guide: User Event Pin Persistence

**Feature**: 029-user-event-pin-entity  
**Date**: 2026-06-18

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL for integration tests)
- EF Core tools: `dotnet tool install --global dotnet-ef` (if not installed)

## Setup

### 1. Apply migration locally (optional manual check)

```bash
cd apps/api
dotnet ef database update
```

Requires local PostgreSQL per `apps/api/appsettings.Development.json` and `.env` (`DB_PASSWORD`).

### 2. Verify model builds

```bash
cd apps/api
dotnet build
```

---

## Validation Scenarios

Each scenario maps to [contracts/persistence-schema.md](./contracts/persistence-schema.md). Automated tests are the primary proof; manual steps are optional.

### Scenario 1: Migration applies (P6, P7)

**Validates**: FR-006, SC-001

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~UserEventPinPersistenceTests"
```

**Expected**: All tests pass; `IntegrationTestBase` runs `MigrateAsync` on fresh Testcontainers DB including `user_event_pins` table.

### Scenario 2: Pin record CRUD via DbContext (P1, P2, P3)

**Validates**: FR-001, FR-002, FR-003

Integration test seeds a user, venue, event, and `UserEventPin` via scoped DbContext, then queries it back.

**Expected**:
- One row in `user_event_pins`
- `PinnedAt` populated
- Duplicate `(user_id, event_id)` insert fails

### Scenario 3: Tenant isolation (P4)

**Validates**: FR-004, SC-003

Integration test creates pins under Org A and Org B; queries with Org A tenant context return only Org A pins.

**Expected**: Zero cross-tenant pin leakage.

### Scenario 4: Event delete cascade (P5)

**Validates**: FR-005, SC-002

Integration test pins an event, deletes the event, asserts pin count is zero.

**Expected**: No orphaned `user_event_pins` rows.

### Scenario 5: User delete cascade (P9)

**Validates**: Platform consistency with `UserVenueScope`

Integration test pins an event, deletes the user, asserts pin count is zero.

**Expected**: No orphaned rows.

### Scenario 6: Coverage gate (P10)

**Validates**: FR-008, SC-005

```bash
cd apps/api.tests
dotnet test --collect:"XPlat Code Coverage"
```

**Expected**: ≥80% line/branch on `UserEventPin.cs`, `ApplicationDbContext` changes, and `UserEventPinPersistenceTests.cs`.

---

## Out of scope (do not validate here)

- `PUT /api/events/{id}/pin` or `DELETE` pin endpoints → SPLR-70
- `GET /dashboard` pin aggregation → SPLR-72
- Frontend `pinnedEventStorage` migration → future frontend issue
- Pin UI behavior on dashboard overview → unchanged (026)

## Related artifacts

- Entity shape: [data-model.md](./data-model.md)
- Design decisions: [research.md](./research.md)
- FR mapping: [contracts/persistence-schema.md](./contracts/persistence-schema.md)
