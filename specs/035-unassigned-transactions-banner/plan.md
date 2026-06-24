# Implementation Plan: Dashboard Unassigned Transactions Banner

**Branch**: `035-unassigned-transactions-banner` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/035-unassigned-transactions-banner/spec.md` (Linear SPLR-75)

## Summary

Add **`UnassignedTransactionsBanner`** to the dashboard overview: a prominent alert when `actionCenter.totalUnmappedCount > 0`, opening an **inline drawer** that lists per-event unmapped workload (accordion expand → transaction list + inline mapping), workspace deep links (`?focus=sync`), and a **success state** when the final transaction is mapped (banner hides, drawer stays open until dismissed). Extend **`useAllVenuesDashboard`** to merge `actionCenter` across parallel venue dashboard fetches (client-side rollup — no new API). Reuse **`InlineMappingDropdown`** / QBO hooks; extend mapping invalidation to refresh dashboard action-center counts. **Frontend-only** — depends on 034 action center DTOs in `generated-api.ts`.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: TanStack Query v5; `ActionCenterDto`, `UnmappedEventSummaryDto`, `UnmappedTransactionDto` from `generated-api.ts`; `useDashboard` / `useAllVenuesDashboard` (`dashboard.ts`); `useUnmappedTransactions`, `useCreateMapping` (`qbo.ts`); `useLedger` (`ledger.ts`); existing `UnmappedBanner` / `InlineMappingDropdown`; `navigateToEventWorkspace`; `useActiveVenue` for venue name resolution; `MobileNavDrawer` as drawer a11y reference

**Storage**: N/A — consumes existing dashboard + QBO mapping APIs

**Testing**: Vitest + React Testing Library — `UnassignedTransactionsBanner.test.tsx` (banner visibility, drawer open/close, accordion, workspace links, zero-state success message, all-venues venue labels); extend `dashboard.test.ts` for `mergeActionCenter`; update `DashboardOverviewPage.test.tsx` (banner integration); MSW/mock patterns from `UnmappedBanner.test.tsx`; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright deferred

**Target Platform**: Vite SPA — `DashboardOverviewPage` (`/`)

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Banner renders from already-fetched dashboard data (no extra request on load); unmapped transaction list + ledger rows fetched **lazily** per expanded accordion row; drawer scrollable for large event lists (SC-002 <10s triage)

**Constraints**: Constitution VI — types from `generated-api.ts` only; Constitution III — Vitest ≥80% on touched files; Constitution IX — FA icons for alert/close/sync link (`faTriangleExclamation`, `faXmark`, `faArrowUpRightFromSquare` or equivalent); no QBO HTTP mutations from UI beyond existing mapping endpoint; mapping invalidates dashboard cache for count refresh (FR-009); ≥80.0% frontend coverage gate (backend N/A — no backend file changes)

**Scale/Scope**: ~2 new components, ~1 dashboard hook extension, ~1 mapping invalidation tweak, CSS block, ~4 test files/updates; 0 backend files; 0 migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | `formatMoney` for transaction amounts (existing); no new monetary math. | PASS (reuse) |
| II. Multi-Tenant Isolation | Dashboard and QBO APIs enforce org/venue scope server-side; hooks pass venueId from action-center rows. | PASS (existing API) |
| III. Engineering Rigor | Vitest + RTL for banner, drawer, hook merge; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration | Reuse read-only unmapped list + mapping persistence; no new QBO HTTP calls. | PASS |
| V. Ledger State Machine | Mapping endpoint enforces settled/reconciled guard server-side (existing). | PASS (existing API) |
| VI. Polyglot Contract | `ActionCenterDto`, `UnmappedEventSummaryDto`, `UnmappedTransactionDto` from `generated-api.ts`. | PASS |
| VII. EF Core Axioms | No backend queries in this issue. | N/A |
| VIII. Exception Governance | Mapping errors surfaced in drawer; no empty catch blocks. | PASS |
| IX. UI Iconography | FA Free icons for banner alert, drawer close, workspace link. | PASS |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/unassigned-transactions-banner-ui.md](./contracts/unassigned-transactions-banner-ui.md) confirm client-side action-center merge, accordion lazy-fetch, dashboard invalidation on mapping, and zero-state drawer behavior. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/035-unassigned-transactions-banner/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── unassigned-transactions-banner-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── api/
│   └── dashboard.ts                              # MODIFY — mergeActionCenter; extend useAllVenuesDashboard
├── components/dashboard/
│   ├── UnassignedTransactionsBanner.tsx          # NEW — banner + drawer orchestration
│   └── UnassignedTransactionsDrawer.tsx        # NEW — drawer panel, accordion rows, success state
├── components/qbo/
│   └── InlineMappingDropdown.tsx                 # MODIFY — invalidate dashboard query on map success
├── pages/
│   └── DashboardOverviewPage.tsx                 # MODIFY — render banner above zones; pass actionCenter + venues
└── index.css                                     # MODIFY — banner + drawer styles

apps/web/tests/
├── api/
│   └── dashboard.test.ts                         # MODIFY — mergeActionCenter unit tests
├── components/dashboard/
│   ├── UnassignedTransactionsBanner.test.tsx     # NEW
│   └── UnassignedTransactionsDrawer.test.tsx     # NEW (optional split from banner tests)
└── pages/
    └── DashboardOverviewPage.test.tsx            # MODIFY — banner integration cases
```

**Structure Decision**: Split banner (trigger + visibility) from drawer (panel + accordion rows) for testability and to mirror `MobileNavDrawer` separation. Action-center merge lives in `dashboard.ts` alongside existing partition merge. Venue names resolved client-side from `useActiveVenue().venues` — `UnmappedEventSummaryDto` already includes `venueId`.

## Implementation Phases

### Phase A — Dashboard hook extension

1. Add `mergeActionCenter(dashboards: DashboardResponse[]): ActionCenterDto` in `dashboard.ts`:
   - `totalUnmappedCount` = sum of per-dashboard totals
   - `eventsWithUnmapped` = concat all lists, re-sort: `unmappedCount` desc, `eventDate` asc
2. Extend `useAllVenuesDashboard` return with `actionCenter: ActionCenterDto | undefined` (merged when all queries settled).
3. Unit tests in `dashboard.test.ts`.

### Phase B — Drawer component

Add `UnassignedTransactionsDrawer.tsx`:
- Props: `open`, `onClose`, `eventsWithUnmapped`, `totalUnmappedCount`, `venues` (for name lookup), `isAllVenuesView`
- Backdrop + panel pattern from `MobileNavDrawer` (Escape, focus trap, `role="dialog"`)
- Per-event accordion row: toggle expand → lazy `useUnmappedTransactions` + `useLedger` for `lineItemOptions`
- Reuse `InlineMappingDropdown` per transaction row (same markup as `UnmappedBanner`)
- Workspace link per row: `navigateToEventWorkspace(venueId, eventId, 'sync')`
- Zero-state: when `totalUnmappedCount === 0` while drawer open, show success message; banner hidden by parent
- Venue switch / parent `venueId` change: close drawer via `useEffect` cleanup in parent

### Phase C — Banner component

Add `UnassignedTransactionsBanner.tsx`:
- Props: `actionCenter`, `venues`, `isAllVenuesView`, `isLoading`
- Hidden when `isLoading` or `totalUnmappedCount === 0` (FR-001/002)
- `role="alert"`; message: `"{n} unassigned transaction(s) detected"` (FR-003)
- Click opens drawer; placed above `dashboard-overview__zones` in `DashboardOverviewPage`

### Phase D — Cache invalidation

In `InlineMappingDropdown.handleConfirm` (or shared helper):
- `invalidateQueries({ queryKey: dashboardQueryKey(venueId) })` after successful mapping
- Preserves existing ledger + unmapped list invalidation

### Phase E — Tests (Constitution III)

**Component** (`UnassignedTransactionsBanner.test.tsx`):
- Banner hidden when count 0 / loading
- Banner visible with correct count text
- Drawer opens on activate; dismisses on close/Escape
- Accordion expand shows transaction list (mock QBO)
- Workspace link calls `navigateToEventWorkspace` with `'sync'`
- Mapping success reduces count (mock invalidation)
- Final mapping: banner hidden, success message in drawer
- All-venues: venue name on rows

**Page** (`DashboardOverviewPage.test.tsx`):
- Banner renders when dashboard `actionCenter.totalUnmappedCount > 0`

**Hook** (`dashboard.test.ts`):
- `mergeActionCenter` sums, concatenates, sorts correctly

## Dependencies

| Dependency | Feature | Required for |
|------------|---------|--------------|
| SPLR-74 / 034 | Action center DTOs on `DashboardResponse` | Banner data source |
| SPLR-71 / 032 | `useDashboard`, overview wiring | Page integration |
| SPLR-18 / 003 | `InlineMappingDropdown`, QBO hooks | Drawer mapping |

## Complexity Tracking

> No constitution violations requiring justification.
