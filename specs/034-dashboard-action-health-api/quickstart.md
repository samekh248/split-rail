# Quickstart Validation Guide: Dashboard Action Center and Financial Health

**Feature**: 034-dashboard-action-health-api  
**Date**: 2026-06-18

## Prerequisites

- .NET 8.0 SDK
- Docker running (Testcontainers PostgreSQL)
- Spec 031 dashboard endpoint merged (`DashboardService`, `GET /dashboard`)
- Node.js (optional — OpenAPI type regeneration)

## Setup

### 1. Verify build

```bash
cd apps/api
dotnet build
```

### 2. Run dashboard tests (including new cases)

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~Dashboard"
```

### 3. Regenerate frontend types (Constitution VI)

```bash
cd apps/api && dotnet build
cd apps/web && npm run gen:api
```

Verify `ActionCenterDto`, `UnmappedEventSummaryDto`, `FinancialHealthDto`, and extended `DashboardResponse` in `apps/web/src/types/generated-api.ts`.

---

## Validation Scenarios

Each scenario maps to [contracts/dashboard-api.md](./contracts/dashboard-api.md).

### Scenario 1: Action center rollup (C1–C3, C11)

**Validates**: FR-001–FR-004, SC-001, SC-006

Seed three events at one venue:
- Event A: 3 unmapped transactions
- Event B: 1 unmapped transaction
- Event C: 0 unmapped

`GET /api/venues/{venueId}/dashboard`

**Expected**:
- `actionCenter.totalUnmappedCount === 4`
- `eventsWithUnmapped` length 2 (A, B only)
- Order: A (3) before B (1); ties broken by date asc
- Sum of `eventCard.unmappedCount` across all partitions === 4

### Scenario 2: Financial health week filter (C4, C12)

**Validates**: FR-005, SC-003

Using UTC reference date, seed:
- Event on Monday of current week (in-week)
- Event on Sunday of current week (in-week)
- Event on prior Sunday (out-of-week)

**Expected**:
- `financialHealth.weekStart` = Monday ISO date
- `financialHealth.weekEnd` = Sunday ISO date
- Only Mon/Sun in-week events contribute to totals

### Scenario 3: Projected column selection (C5–C6)

**Validates**: FR-006, SC-002

Seed two in-week events with known line items:
- `PRE_SHOW` + budget locked: proforma net ≠ settlement net → projected uses **proforma**
- `SETTLED`: projected uses **settlement**

**Expected**: Integration fixture totals match hand-calculated projected sums.

### Scenario 4: Actual QBO deposits scope (C7–C8)

**Validates**: FR-007, FR-008

Seed in-week event with:
- Revenue line: `qboActualValue = 5000`
- Expense line (artist deduction): `qboActualValue = 200`

**Expected**:
- `actualQboDeposits === "5000.00"` (expense excluded)
- `variance === projectedNetGross - 5000` (money strings)

### Scenario 5: Zero states (C9)

**Validates**: FR-013

Venue with events but none in current week and zero unmapped.

**Expected**:
- `actionCenter.totalUnmappedCount === 0`
- `eventsWithUnmapped === []`
- `financialHealth` all money fields `"0.00"`
- HTTP 200; blocks present (not null/omitted)

### Scenario 6: Regression — partitions unchanged (C10)

**Validates**: FR-014

Run existing `DashboardControllerTests` partition, pin, variance, auth cases.

**Expected**: All spec 031 tests pass without modification to expected partition behavior.

### Scenario 7: Coverage gate (C13)

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~Dashboard" --collect:"XPlat Code Coverage"
```

**Expected**: ≥80% line/branch on `DashboardService`, `DashboardFinancialHealthHelper`, `DashboardDtos`.

---

## Manual smoke (optional)

With API running locally and seeded venue:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/venues/{venueId}/dashboard | jq '.actionCenter, .financialHealth'
```

Confirm JSON structure matches [data-model.md](./data-model.md).

---

## Out of scope (downstream)

- Unassigned Transactions banner UI → SPLR-75
- Financial Health widget UI → SPLR-76
- Bottleneck alerts in action center
