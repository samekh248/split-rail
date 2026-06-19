# Quickstart Validation Guide: Dashboard Aggregate API

**Feature**: 031-dashboard-aggregate-api  
**Date**: 2026-06-18

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL for integration tests)
- UserEventPin entity and migration applied (spec 029 / SPLR-69)
- Node.js (optional — for OpenAPI type regeneration only)

## Setup

### 1. Verify build

```bash
cd apps/api
dotnet build
```

### 2. Run dashboard integration tests

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~DashboardControllerTests"
```

### 3. Regenerate frontend types (Constitution VI)

```bash
cd apps/api && dotnet run &
cd apps/web && npm run gen:api
```

Verify `DashboardResponse` and `EventCardDto` appear in `apps/web/src/types/generated-api.ts`.

---

## Validation Scenarios

Each scenario maps to [contracts/dashboard-api.md](./contracts/dashboard-api.md). Automated tests are the primary proof.

### Scenario 1: Full partition matrix (B1–B5)

**Validates**: FR-001, FR-002, FR-003, SC-001

Integration test seeds events: today, yesterday, 7 days ago, 8 days ago, tomorrow, 30 days ahead, 31 days ahead, plus one pinned upcoming event. `GET /api/venues/{venueId}/dashboard` → assert partition membership.

**Expected**: Correct zone placement; pinned+upcoming event in both arrays; 8-days-ago and 31-days-ahead events in no partition.

### Scenario 2: Aggregate correctness (B6–B8)

**Validates**: FR-005, SC-002

Integration test seeds an event with:
- Line item: `SettlementValue = 100`, `QboActualValue = 90` → `hasVarianceConcern: true`
- Two `UnmappedQboTransaction` rows → `unmappedCount: 2`
- `QboSyncLedger` with known `SyncedAt` → `lastSyncedAt` matches max

**Expected**: Summary fields match seeded data; event with zero variance and no unmapped/sync shows neutral values.

### Scenario 3: Server-side pins (B9)

**Validates**: FR-006, User Story 3

Integration test: `PUT .../events/{eventId}/pin` (spec 030) → `GET .../dashboard` → event in `pinnedEvents` with `isPinned: true`. Second user sees empty `pinnedEvents` for same event.

**Expected**: Per-user pin isolation.

### Scenario 4: Authorization (B10)

**Validates**: FR-007, SC-005

Integration test: role without `can_view_financials` → `GET .../dashboard` → 403.

**Expected**: Permission denial before dashboard data returned.

### Scenario 5: Tenant isolation (B11–B12)

**Validates**: FR-008, SC-003

Integration test: Org A user requests Org B venue dashboard → 404. Scoped user requests out-of-scope venue → 404.

**Expected**: No cross-tenant data leakage.

### Scenario 6: Empty venue (B13)

**Validates**: FR-009

Integration test: venue with zero events → 200 with four empty arrays.

**Expected**: Successful response; clients can render empty zone messages.

### Scenario 7: Coverage gate (B14)

**Validates**: FR-011, SC-006

```bash
cd apps/api.tests
dotnet test --collect:"XPlat Code Coverage"
```

**Expected**: ≥80% line/branch on `DashboardService`, `DashboardController`, `DashboardDtos`, and `DashboardControllerTests`.

### Scenario 8: OpenAPI types (B15)

**Validates**: Constitution VI

After API build, run `npm run gen:api` and confirm no manual TypeScript interface was added under `apps/web/src/`.

**Expected**: Generated types only; no frontend wiring required in this issue.

---

## Out of scope (do not validate here)

- Frontend `useDashboard()` hook → SPLR-71
- ActionCenter / FinancialHealth blocks → SPLR-74
- Bottleneck alert chips on event cards → client derivation (025) until future API extension
- Venue timezone-aware partitioning → deferred (UTC default)

## Related artifacts

- API contract: [contracts/dashboard-api.md](./contracts/dashboard-api.md)
- Data model: [data-model.md](./data-model.md)
- Design decisions: [research.md](./research.md)
- Pin entity (upstream): [../029-user-event-pin-entity/data-model.md](../029-user-event-pin-entity/data-model.md)
- Overview partition rules (client reference): [../026-dashboard-overview-page/spec.md](../026-dashboard-overview-page/spec.md)
