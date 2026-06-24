# Implementation Plan: Financial Health Widget and Recent Events Bottleneck Filter

**Branch**: `dustin/splr-76-build-financialhealthwidget-and-bottleneckfilter-for-recent` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-financial-health-bottleneck-filter/spec.md` (Linear SPLR-76)

## Summary

Add **`FinancialHealthWidget`** to the single-venue dashboard overview — displays current-week date range plus projected net gross, actual QBO deposits, and variance from `DashboardResponse.financialHealth`, formatted via **`formatMoney`**. Add **`BottleneckFilter`** toggle on the Recent Events zone header to client-filter `recentEvents` to events with bottleneck alerts (shared derivation with `EventCard`). Wire both into **`DashboardOverviewPage`** via existing **`useDashboard()`** data. Verify variance warning badge on **`EventCard`** for **`SETTLED`** events when `hasVarianceConcern` is true (tests; no status gate). **Frontend-only** — depends on 034 `FinancialHealthDto` and 032 overview wiring.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: TanStack Query v5; `FinancialHealthDto`, `EventCardDto`, `DashboardResponse` from `generated-api.ts`; `useDashboard` / `useAllVenuesDashboard` (`dashboard.ts`); `formatMoney` (`money.ts`); `deriveBottleneckAlertsFromSummary`, `mergeBottleneckAlerts` (`eventCardSummary.ts`); `deriveBottleneckAlerts` (`eventLifecycle.ts`); existing zone sections (`DashboardZoneSections.tsx`); `UnassignedTransactionsBanner` placement reference (035)

**Storage**: N/A — consumes existing dashboard aggregate API

**Testing**: Vitest + React Testing Library — `FinancialHealthWidget.test.tsx`, `BottleneckFilter.test.tsx`, `eventCardSummary.test.ts` (or `bottleneckFilter.test.ts`); extend `EventCard.test.tsx` (SETTLED + variance); extend `DashboardOverviewPage.test.tsx` (widget visibility, filter toggle, venue reset, all-venues hide); ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright deferred

**Target Platform**: Vite SPA — `DashboardOverviewPage` (`/`)

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Filter toggle updates list synchronously (<50ms perceived, client-side only); widget renders from cached dashboard response (no extra request)

**Constraints**: Constitution I — `formatMoney` only for monetary display; Constitution VI — types from `generated-api.ts`; Constitution III — Vitest ≥80% on touched files; Constitution IX — FA Free icons (`faChartLine`, `faFilter`); no new API routes; financial health hidden in all-venues view (FR-004); ≥80.0% frontend coverage gate (backend N/A)

**Scale/Scope**: ~2 new components, ~1 lib helper, ~2 modified components, ~1 page wiring, CSS block, ~4 test files/updates; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | `formatMoney` for all widget amounts; no float math. | PASS (reuse) |
| II. Multi-Tenant Isolation | Dashboard API enforces org/venue scope; widget reads scoped hook. | PASS (existing API) |
| III. Engineering Rigor | Vitest + RTL for widget, filter, overview integration, EventCard variance; ≥80% touched files. | PASS (with tests) |
| IV. QBO Integration | Read-only consumption of server-computed QBO deposit totals. | PASS |
| V. Ledger State Machine | No mutations. | N/A |
| VI. Polyglot Contract | `FinancialHealthDto`, `EventCardDto` from `generated-api.ts`. | PASS |
| VII. EF Core Axioms | No backend queries in this issue. | N/A |
| VIII. Exception Governance | Loading/error states follow overview patterns. | PASS |
| IX. UI Iconography | FA Free icons for widget header and filter chip. | PASS |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/financial-health-bottleneck-ui.md](./contracts/financial-health-bottleneck-ui.md) confirm single-venue financial health consumption, shared bottleneck derivation, filter reset on venue scope, and zero-event widget visibility. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/036-financial-health-bottleneck-filter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── financial-health-bottleneck-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   └── eventCardSummary.ts                       # MODIFY — add eventHasBottleneckAlerts (+ optional filterRecentEventsByBottleneck)
├── components/dashboard/
│   ├── FinancialHealthWidget.tsx                 # NEW — week range + 3 money rows
│   ├── BottleneckFilter.tsx                    # NEW — "Needs attention" toggle chip
│   └── DashboardZoneSections.tsx                 # MODIFY — RecentEventsSection header slot for filter
├── pages/
│   └── DashboardOverviewPage.tsx                 # MODIFY — wire financialHealth, filter state, widget placement
└── index.css                                       # MODIFY — financial-health + filter chip styles

apps/web/tests/
├── lib/
│   └── eventCardSummary.test.ts                  # MODIFY/NEW — eventHasBottleneckAlerts cases
├── components/dashboard/
│   ├── FinancialHealthWidget.test.tsx            # NEW
│   └── BottleneckFilter.test.tsx                 # NEW
├── components/dashboard/EventCard.test.tsx       # MODIFY — SETTLED + hasVarianceConcern
└── pages/DashboardOverviewPage.test.tsx          # MODIFY — widget + filter integration
```

**Structure Decision**: Keep bottleneck derivation in `eventCardSummary.ts` adjacent to existing alert merge logic. Split widget and filter into dedicated components for isolated RTL tests. Extend `RecentEventsSection` with a `filterSlot` prop rather than hard-coding filter inside the zone component — keeps `BottleneckFilter` reusable and testable.

## Implementation Phases

### Phase A — Shared bottleneck helper

1. Add `eventHasBottleneckAlerts(event: EventCardDto): boolean` using existing merge path.
2. Add `filterRecentEventsByBottleneck(events, active)` pure wrapper.
3. Unit tests: unmapped only, settled-not-synced, hasVarianceConcern, no alerts, multiple alert kinds.

### Phase B — FinancialHealthWidget

1. Create `FinancialHealthWidget.tsx` with props `financialHealth`, `isLoading`.
2. Render week range + three labeled money rows via `formatMoney`.
3. Return `null` when loading or `financialHealth` undefined.
4. RTL tests: fixture DTO renders correct testids and formatted values; loading/null guards.

### Phase C — BottleneckFilter + Recent zone header

1. Create `BottleneckFilter.tsx` with toggle button, `aria-pressed`, FA icon.
2. Extend `RecentEventsSection` to accept optional `filterSlot` in header flex row.
3. Parent passes dynamic `emptyMessage` when filter active and zero matches.
4. RTL tests: toggle fires callback; `aria-pressed` reflects state.

### Phase D — DashboardOverviewPage wiring

1. Add `bottleneckFilterActive` state; reset on `venueScopeKey` change (`useEffect`).
2. Read `financialHealth` from `singleVenueDashboard.data?.financialHealth`.
3. Render `FinancialHealthWidget` below banner, above zones (single-venue, loaded).
4. Also render widget in zero-events branch when dashboard succeeds (single-venue).
5. Pass filtered recent events + `BottleneckFilter` into `RecentEventsSection`.
6. Integration tests: widget visible/hidden cases, filter reduces list, venue switch resets filter.

### Phase E — EventCard variance verification

1. Audit `EventCard` — confirm no status gate on `hasVarianceConcern` badge path.
2. Add `EventCard.test.tsx` cases: `SETTLED` + `hasVarianceConcern: true` shows badge; `SETTLED` + false hides badge.

### Phase F — Styles & coverage gate

1. Add BEM classes: `financial-health-widget`, `bottleneck-filter` (match dashboard zone patterns).
2. Run Vitest on touched files; confirm ≥80% line/branch coverage.

## Risk & Dependency Notes

- **Blocked by 034**: `financialHealth` on dashboard response must exist before widget can render real data.
- **Blocked by 032**: Overview must use `useDashboard()` partitions (already shipped on branch).
- **035 coexistence**: Widget sits below `UnassignedTransactionsBanner`; no layout conflict.
- **All-venues**: Financial health hidden; bottleneck filter still applies to merged `recentEvents`.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
