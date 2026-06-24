# Implementation Plan: Wire Global Nav Settlements and Accounting Sync to Venue QBO Views

**Branch**: `037-global-nav-qbo-views` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-global-nav-qbo-views/spec.md` (Linear SPLR-77)

## Summary

Enable the **Settlements / Accounting Sync** global nav item for users with `canViewFinancials`, routing to a new **`/accounting`** venue-scoped overview page. The overview reuses **`useDashboard`** action-center data and **035 banner/drawer** for inline mapping, adds an **accounting workload list** (bottleneck + unmapped events), a **venue QBO status card**, and a **venue-wide Sync all** button. Backend adds **`GET /api/venues/{venueId}/qbo/status`** and **`POST /api/venues/{venueId}/sync`** with per-event partial-failure reporting. Update **`globalNav.ts`**, **`GlobalNav`** (permission filter + FA icons), **`appRoute.ts`**, and **`App.tsx`** routing; Vitest + xUnit ≥80% on touched files.

## Technical Context

**Language/Version**: C# / .NET 9 (`apps/api`) + TypeScript 5.7 / React 18 (`apps/web`)

**Primary Dependencies**: TanStack Query v5; `DashboardResponse` / `ActionCenterDto` / `EventCardDto` from `generated-api.ts`; `UnassignedTransactionsBanner` / `UnassignedTransactionsDrawer` (035); `deriveBottleneckAlertsFromSummary` (`eventCardSummary.ts`); `useCanManageEvents` / `useCanTriggerQboSync`; `QboSyncService` (existing per-event sync); Font Awesome Free (Constitution IX)

**Storage**: PostgreSQL via EF Core — reads `QboVenueCredential`, `QboSyncLedger`, `Events`; no migrations

**Testing**: xUnit + Testcontainers for venue sync/status endpoints; Vitest + RTL for `globalNav`, `GlobalNav`, `AccountingOverviewPage`, `SyncAllButton`, `accountingWorkload.ts`; extend `mockWorkspaceFetch`; ≥80.0% line/branch coverage on touched backend and frontend files (Constitution III)

**Target Platform**: Vite SPA + ASP.NET Core API (GCP Cloud Run)

**Project Type**: Web application — vertical slice across `apps/api` + `apps/web`

**Performance Goals**: Overview loads from single dashboard GET + lightweight status GET; sync-all processes events sequentially server-side (acceptable for ≤50 events per venue per SC-004 scale); no stale count flash during load

**Constraints**: Constitution IV — read-only QBO HTTP; Constitution VI — types from `generated-api.ts`; Constitution II — venue/org scope on all new endpoints; accounting nav hidden without `canViewFinancials`; ≥80.0% coverage gate; blocked by SPLR-76 for full dashboard widget parity but not for accounting page wiring

**Scale/Scope**: ~1 new page, ~3 new/modified shell modules, ~2 new QBO UI components, ~2 API endpoints, ~1 service method, ~6 test files; 0 migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No new monetary math; `formatMoney` for display only. | N/A |
| II. Multi-Tenant Isolation | New endpoints use `VenueService.IsVenueAccessibleAsync`; dashboard/QBO routes already scoped. | PASS (with tests) |
| III. Engineering Rigor | Vitest + RTL (shell, page, sync button); xUnit integration for venue sync/status; ≥80% touched files. | PASS (with tests) |
| IV. QBO Integration | Venue sync orchestrates existing read-only `SyncEventAsync`; no new QBO HTTP mutations. | PASS |
| V. Ledger State Machine | Per-event sync inherits settled/reconciled guards inside `SyncEventAsync`. | PASS (existing) |
| VI. Polyglot Contract | New DTOs in C# → swagger → `generated-api.ts`; no hand-written API types. | PASS |
| VII. EF Core Axioms | Eligibility/status queries use `.AsNoTracking()` + explicit filters. | PASS |
| VIII. Exception Governance | Per-event sync failures captured in `VenueSyncResultDto`; sanitized messages. | PASS |
| IX. UI Iconography | Migrate `GlobalNav` letter placeholders to FA icons on touched surface. | PASS |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/venue-qbo-sync-api.md](./contracts/venue-qbo-sync-api.md), and [contracts/accounting-overview-ui.md](./contracts/accounting-overview-ui.md) confirm route `/accounting`, permission-hidden nav, 035 reuse, venue-scoped sync orchestration, and status endpoint. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/037-global-nav-qbo-views/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── venue-qbo-sync-api.md
│   └── accounting-overview-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/api/
├── DTOs/Qbo/
│   ├── VenueQboStatusDto.cs          # NEW
│   └── VenueSyncResultDto.cs         # NEW
├── Services/
│   └── QboSyncService.cs             # MODIFY — SyncVenueEventsAsync, GetVenueQboStatusAsync
└── Controllers/
    └── QboSyncController.cs          # MODIFY — or QboVenueController: status + venue sync routes

apps/api.tests/
└── Integration/
    └── VenueQboSyncTests.cs          # NEW — status, sync, permissions, partial failure

apps/web/src/
├── lib/
│   ├── globalNav.ts                  # MODIFY — enable accounting, matchPaths, navigateToAccounting
│   ├── appRoute.ts                   # MODIFY — /accounting path
│   └── accountingWorkload.ts         # NEW — derive workload events from dashboard
├── api/
│   └── qbo.ts                        # MODIFY — useVenueQboStatus, useVenueSync
├── components/shell/
│   └── GlobalNav.tsx                 # MODIFY — permission filter, FA icons
├── components/qbo/
│   └── SyncAllButton.tsx             # NEW
├── components/accounting/
│   ├── VenueQboStatusCard.tsx        # NEW
│   └── AccountingWorkloadList.tsx    # NEW
├── pages/
│   └── AccountingOverviewPage.tsx    # NEW
└── App.tsx                           # MODIFY — route /accounting

apps/web/tests/
├── shell/GlobalNav.test.tsx          # MODIFY — permission, accounting active state
├── lib/globalNav.test.ts             # NEW — resolveActiveGlobalNavId /accounting
├── lib/accountingWorkload.test.ts    # NEW
├── pages/AccountingOverviewPage.test.tsx  # NEW
├── components/qbo/SyncAllButton.test.tsx    # NEW
└── utils/mockWorkspaceFetch.ts       # MODIFY — venue sync/status routes
```

**Structure Decision**: New `components/accounting/` namespace for page-specific presentational components; reuse `components/dashboard/` banner/drawer unchanged. Backend extends existing `QboSyncService` rather than new controller file unless route clutter warrants `QboVenueController`.

## Implementation Phases

### Phase A — Backend venue sync & status (blocking for Sync all)

1. Add `VenueQboStatusDto`, `VenueSyncEventResultDto`, `VenueSyncResultDto` in `apps/api/DTOs/Qbo/`.
2. Implement `GetVenueQboStatusAsync` and `SyncVenueEventsAsync` in `QboSyncService`.
3. Expose `GET .../qbo/status` and `POST .../sync` on venue-scoped controller with permission attributes.
4. Regenerate `generated-api.ts`.
5. Integration tests in `VenueQboSyncTests.cs`.

### Phase B — Routing & global nav

1. Extend `appRoute.ts` with `/accounting` + `navigateToAccounting` (all-venues exit via `activateVenueId`).
2. Update `globalNav.ts` — enable accounting item, `matchPaths`, active-state.
3. Filter accounting item in `GlobalNav` by `useCanManageEvents()`; add FA icons.
4. Wire `App.tsx` → `AccountingOverviewPage`.
5. Update `GlobalNav.test.tsx` / add `globalNav.test.ts`.

### Phase C — Accounting overview page

1. Add `accountingWorkload.ts` + tests.
2. Build `VenueQboStatusCard`, `AccountingWorkloadList`, `SyncAllButton`.
3. Compose `AccountingOverviewPage` — dashboard hook, banner/drawer reuse, empty state, top-bar venue switcher compatibility.
4. Extend `qbo.ts` with venue status/sync hooks.
5. `AccountingOverviewPage.test.tsx` + `SyncAllButton.test.tsx`.

### Phase D — Verification

1. Run quickstart scenarios ([quickstart.md](./quickstart.md)).
2. Confirm coverage ≥80% on touched files.
3. Manual mobile drawer check for accounting nav parity.

## Dependencies & Blocking

| Dependency | Required for |
|------------|--------------|
| SPLR-76 / 036 | Bottleneck derivation parity on workload list (can use existing `eventCardSummary` helpers without 036 UI widgets) |
| 035 merged | Banner/drawer components |
| 034 merged | `actionCenter` on dashboard response |
| 031 merged | `useDashboard` hook |

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
