# Implementation Plan: Dashboard Aggregate API

**Branch**: `031-dashboard-aggregate-api` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-dashboard-aggregate-api/spec.md` (Linear SPLR-72)

## Summary

Add a **venue-scoped dashboard aggregate endpoint** that returns server-partitioned event collections (tonight, pinned, recent, upcoming) with per-event summary fields (`hasVarianceConcern`, `unmappedCount`, `lastSyncedAt`, `isPinned`) in a single read-only response. Implement **`DashboardService.GetDashboardAsync`** with one EF round-trip (`.AsNoTracking()` + explicit `.Include()` per Constitution VII), expose **`GET /api/venues/{venueId}/dashboard`** on a new **`DashboardController`** gated by `can_view_financials`, define **`DashboardDtos.cs`**, regenerate **`generated-api.ts`**, and verify with **xUnit integration tests** covering partition boundaries, aggregate correctness, tenant isolation, and permission denial. **Backend-only** — no frontend wiring (SPLR-71); ActionCenter/FinancialHealth deferred (SPLR-74).

## Technical Context

**Language/Version**: C# / .NET 8.0 (`apps/api`)

**Primary Dependencies**: ASP.NET Core 8, Entity Framework Core 8, existing entities (`Event`, `FinancialLineItem`, `UnmappedQboTransaction`, `QboSyncLedger`, `UserEventPin` from spec 029), `VenueService`, `LedgerService` variance formula

**Storage**: PostgreSQL 16 — read-only queries against existing tables; no new migration

**Testing**: xUnit + WebApplicationFactory + Testcontainers.PostgreSql (`apps/api.tests/Integration/DashboardControllerTests.cs`); OpenAPI type regen via `npm run gen:api`; ≥80.0% line/branch coverage on **backend** touched files (Constitution III); no frontend Vitest files in this issue — frontend coverage gate satisfied by type regen only

**Target Platform**: GCP Cloud Run API + local Docker PostgreSQL

**Project Type**: Web application monorepo — this feature touches **backend API layer only** (+ generated TS types)

**Performance Goals**: Single EF round-trip per dashboard request; SC-004 target ≤2s for 50 events in integration environment

**Constraints**: Constitution II — org scoping via EF global filters + `VenueService.IsVenueAccessibleAsync`; Constitution V N/A (read-only); Constitution VI — DTOs in C# first, regenerate `generated-api.ts`; Constitution VII — `.Include()` + `.AsNoTracking()` on dashboard query; variance uses same formula as `LedgerService.ToLineItemDto`; partition boundaries use UTC calendar dates (no venue timezone field); ≥80.0% backend coverage; missing/unparseable coverage reports treated as failing

**Scale/Scope**: 1 new service, 1 new controller, 1 DTO file, ~1 integration test file (~12–15 cases), 0 migrations, 0 frontend component changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Variance uses existing `decimal` line-item fields; no new monetary math. | PASS |
| II. Multi-Tenant Isolation | **Yes** — venue access check + EF org filters on Events/UserEventPin. | PASS |
| III. Engineering Rigor | **Yes** — integration tests via Testcontainers; ≥80% on touched backend files. | PASS (primary driver) |
| IV. QBO Integration | Read-only aggregation of sync ledger/unmapped rows; no QBO HTTP mutations. | PASS |
| V. Ledger State Machine | Read-only; no event/line-item mutations. | N/A |
| VI. Polyglot Contract | **Yes** — new DTOs → swagger → `generated-api.ts`; no hand-written TS interfaces. | PASS |
| VII. EF Core Axioms | **Yes** — single eager-loaded `.AsNoTracking()` query for dashboard. | PASS |
| VIII. Exception Governance | Use existing `NotFoundException`, `AuthenticationException`; no empty catch blocks. | PASS |
| IX. UI Iconography | No UI changes. | N/A |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/dashboard-api.md](./contracts/dashboard-api.md) confirm query strategy, DTO shape, and test matrix. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/031-dashboard-aggregate-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── dashboard-api.md # Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── Controllers/
│   └── DashboardController.cs       # NEW — GET /api/venues/{venueId}/dashboard
├── DTOs/
│   └── Dashboard/
│       └── DashboardDtos.cs         # NEW — DashboardResponse, EventCardDto
├── Services/
│   ├── DashboardService.cs          # NEW — GetDashboardAsync
│   └── LedgerVarianceHelper.cs      # NEW (optional) — shared variance flag logic
└── Program.cs                         # MODIFY — register DashboardService

apps/api.tests/
└── Integration/
    └── DashboardControllerTests.cs  # NEW — partition, aggregates, auth, isolation

apps/web/src/types/
    └── generated-api.ts               # REGENERATE via npm run gen:api
```

**Structure Decision**: Dedicated `DashboardController` and `DashboardService` keep aggregate read logic separate from `EventService` list/get and `QboSyncService` per-event status. Optional `LedgerVarianceHelper` extracts the two-line variance check shared with `LedgerService` if duplication would otherwise diverge.

## Implementation Phases

### Phase A — Prerequisites (blocking)

1. Confirm spec 029 (`UserEventPin` entity + migration) is merged on branch.
2. Confirm spec 030 pin endpoints available for pin-isolation test scenarios (optional for core GET, required for B9).

### Phase B — DTOs and service (P1 core)

1. Add `DashboardDtos.cs` per [data-model.md](./data-model.md):
   - `EventCardDto` with core event fields + `IsPinned`, `HasVarianceConcern`, `UnmappedCount`, `LastSyncedAt`
   - `DashboardResponse` with four partition collections + `VenueId`
2. Add `DashboardService.GetDashboardAsync(venueId)`:
   - Validate user + venue access via `VenueService`
   - Single query: events for venue with `.Include(e => e.LineItems)`, `.Include(e => e.UnmappedQboTransactions)`, `.Include(e => e.QboSyncLedgerEntries)`, pin join for current user
   - Map each event to `EventCardDto` with aggregates
   - Partition into tonight/pinned/recent/upcoming per [research.md](./research.md) UTC rules
   - Return all four arrays (empty when no matches)
3. Register `DashboardService` in `Program.cs`.

### Phase C — Controller endpoint

Add `DashboardController.cs` per [contracts/dashboard-api.md](./contracts/dashboard-api.md):

```csharp
[ApiController]
[Route("api/venues/{venueId:guid}/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    [HttpGet]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<DashboardResponse>> Get(...)
}
```

### Phase D — Integration tests (Constitution III)

Add `DashboardControllerTests.cs` covering [contracts/dashboard-api.md](./contracts/dashboard-api.md):

1. Mixed-date partition matrix (today, ±7d, ±30d, outside windows)
2. Pinned + date-zone overlap
3. Variance flag from seeded line items
4. Unmapped count from `UnmappedQboTransaction` rows
5. `LastSyncedAt` from `QboSyncLedger` max
6. Per-user pin isolation (via pin API or direct seed)
7. Cross-org request → 404
8. Out-of-scope venue → 404
9. Missing `can_view_financials` → 403
10. Empty venue → 200 with four empty arrays

### Phase E — OpenAPI type regeneration (Constitution VI)

```bash
cd apps/api && dotnet build
cd apps/web && npm run gen:api
```

Verify `DashboardResponse` / `EventCardDto` in `generated-api.ts`; no manual TS types added.

### Phase F — Coverage gate

```bash
cd apps/api.tests
dotnet test --filter "FullyQualifiedName~DashboardControllerTests"
dotnet test --collect:"XPlat Code Coverage"
```

Verify ≥80% on `DashboardService`, `DashboardController`, `DashboardDtos`, and test file.

## Complexity Tracking

No constitution violations to justify.
