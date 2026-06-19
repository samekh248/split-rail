# Implementation Plan: Server-Backed Dashboard Overview and Pin Persistence

**Branch**: `032-overview-dashboard-wire` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-overview-dashboard-wire/spec.md` (Linear SPLR-71)

## Summary

Wire the **Phase 1 dashboard overview** to consume the **server dashboard aggregate** (`GET /api/venues/{venueId}/dashboard`) and **server pin mutations** (`PUT`/`DELETE .../pin`) instead of `useEvents()` + client-side `partitionOverviewZones()` + `pinnedEventStorage`. Add **`apps/web/src/api/dashboard.ts`** with `useDashboard`, `usePinEvent`, and `useUnpinEvent` (TanStack Query, `staleTime: 30_000`, types from `generated-api.ts`). Refactor **`DashboardOverviewPage`** to render server partition arrays directly; extend **`EventCard`** to prefer server summary fields (`hasVarianceConcern`, `unmappedCount`, `lastSyncedAt`, `isPinned`) with client lifecycle/bottleneck fallback; implement **optimistic pin toggles** with dashboard cache updates and rollback on failure. **Frontend-only** — no new backend endpoints. Vitest + RTL ≥80% on touched files.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: TanStack Query v5; `DashboardResponse` / `EventCardDto` from `generated-api.ts`; existing `GET /dashboard` (031) and pin endpoints (030); `EventCard`, zone sections, `useActiveVenue`, `useShellWorkspaceBar`, `deriveLifecyclePhase` / `deriveBottleneckAlerts` from `eventLifecycle.ts`

**Storage**: Server-side `UserEventPin` via pin API; **remove** `pinnedEventStorage` usage from overview (FR-012)

**Testing**: Vitest + React Testing Library — `dashboard.test.ts` (hooks), updated `DashboardOverviewPage.test.tsx` (server partitions + optimistic pin), `EventCard.test.tsx` (server summary fields); MSW or `mockWorkspaceFetch` extension for dashboard/pin routes; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright deferred

**Target Platform**: Vite SPA — dashboard entry route `/` inside `AppShell`

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Single dashboard GET per active venue; ~30s query freshness (FR-013 / SC-004); optimistic pin UI update <200ms; all-venues mode uses parallel dashboard fetches (one per venue)

**Constraints**: Constitution VI — no hand-written API types; Constitution III — Vitest coverage ≥80%; Constitution IX — existing FA pin icons; retain Phase 1 zone order/layout (026); no Action Center / Financial Health / Unassigned Transactions (FR-014); ≥80.0% coverage gate on frontend touched files (backend N/A — no backend file changes)

**Scale/Scope**: ~1 new API module, ~1 page refactor, ~1 EventCard enhancement, zone prop type widenings, test/mock updates, optional deprecation of overview-only `partitionOverviewZones` usage; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math on overview; server sends pre-computed flags. | N/A |
| II. Multi-Tenant Isolation | Dashboard and pin APIs enforce org/venue scope server-side; hooks pass venueId from `useActiveVenue`. | PASS (existing API) |
| III. Engineering Rigor | Vitest + RTL for hooks, page, EventCard; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration | No QBO calls from overview; sync quick links navigate only. | PASS |
| V. Ledger State Machine | No ledger mutations from overview. | N/A |
| VI. Polyglot Contract | `DashboardResponse`, `EventCardDto`, `PermissionsDto` from `generated-api.ts` only. | PASS |
| VII. EF Core Axioms | No backend queries in this issue. | N/A |
| VIII. Exception Governance | Pin mutation errors surfaced to user; optimistic rollback; no empty catch blocks. | PASS |
| IX. UI Iconography | Reuse `faThumbtack` / `faThumbtackSlash` in EventCard pin control. | PASS |

**Post-design re-check (Phase 1)**: [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/dashboard-hooks-ui.md](./contracts/dashboard-hooks-ui.md) confirm hook shapes, optimistic cache strategy, all-venues merge, and EventCard summary precedence. Gates remain PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/032-overview-dashboard-wire/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── dashboard-hooks-ui.md  # Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── api/
│   └── dashboard.ts                     # NEW — useDashboard, useAllVenuesDashboard, usePinEvent, useUnpinEvent
├── pages/
│   └── DashboardOverviewPage.tsx        # MODIFY — server partitions; remove useEvents/partition/pinnedStorage
├── components/dashboard/
│   ├── EventCard.tsx                    # MODIFY — server summary fields; lifecycle fallback
│   ├── DashboardZoneEvents.tsx          # MODIFY — EventCardDto[] typing
│   └── DashboardZoneSections.tsx        # MODIFY — EventCardDto[] typing
└── lib/
    ├── eventLifecycle.ts                # EXISTING — fallback deriveLifecyclePhase / deriveBottleneckAlerts
    └── partitionOverviewZones.ts        # KEEP — unit tests only; overview stops importing

apps/web/tests/
├── api/
│   └── dashboard.test.ts                # NEW — hook query keys, pin optimistic/rollback
├── pages/
│   └── DashboardOverviewPage.test.tsx   # MODIFY — mock dashboard + pin API
├── components/dashboard/
│   └── EventCard.test.tsx               # MODIFY — hasVarianceConcern, unmappedCount paths
└── utils/
    └── mockWorkspaceFetch.ts            # MODIFY — dashboard + pin route handlers
```

**Structure Decision**: Single vertical slice through `apps/web`. Data access centralized in `api/dashboard.ts` mirroring `api/events.ts` patterns. Page becomes a thin composition layer over server partition arrays. EventCard accepts `EventCardDto`-compatible event shape (structural superset of `EventResponse` fields plus summary booleans).

## Implementation Phases

### Phase A — Prerequisites (blocking)

1. Confirm **031** merged: `GET /api/venues/{venueId}/dashboard`, `DashboardResponse` / `EventCardDto` in `generated-api.ts`.
2. Confirm **030** merged: `PUT`/`DELETE /api/venues/{venueId}/events/{eventId}/pin`.
3. Confirm **026** on branch: `DashboardOverviewPage`, zone sections, existing RTL tests.

### Phase B — Dashboard API hooks (P1 core)

Add `dashboard.ts` per [contracts/dashboard-hooks-ui.md](./contracts/dashboard-hooks-ui.md):

1. `dashboardQueryKey(venueId)` → `['dashboard', venueId]`
2. `useDashboard(venueId)` — `GET /venues/{venueId}/dashboard`, `enabled: Boolean(venueId)`, `staleTime: 30_000`
3. `useAllVenuesDashboard(venueIds)` — `useQueries` parallel fetch; merge four partition arrays (concat per zone, dedupe by `eventId` within zone)
4. `usePinEvent(venueId)` / `useUnpinEvent(venueId)` — `PUT`/`DELETE .../pin`; `onSuccess` → `invalidateQueries(dashboardQueryKey)`
5. Shared optimistic helper `applyPinOptimisticUpdate(queryClient, venueId, eventId, pinned: boolean)` for `onMutate` / rollback

### Phase C — EventCard server summary integration (P2)

1. Widen `EventCard` `event` prop to accept fields from `EventCardDto` (import type only from `generated-api.ts`).
2. Variance badge: show when `event.hasVarianceConcern === true` OR legacy `lineItems` path (keep workspace compatibility).
3. Bottleneck chips: prefer server-driven rules from `EventCardDto` fields (`unmappedCount`, `lastSyncedAt`, `settledAt`, `status`) via new helper `deriveBottleneckAlertsFromSummary(dto)`; fallback to `deriveBottleneckAlerts(event)` when summary fields absent.
4. Lifecycle / quick links: `deriveLifecyclePhase(event)` using shared event fields (no `lifecyclePhase` on DTO yet — FR-010 fallback).
5. Pin display: use `event.isPinned` from DTO when present; page passes `onPinToggle` as today.

### Phase D — DashboardOverviewPage wiring (P1–P3)

1. Replace `useEvents` / `useAllVenuesEvents` + `partitionOverviewZones` with `useDashboard(activeVenueId)` / `useAllVenuesDashboard`.
2. Map response partitions directly:
   - `pinnedEvents` → `PinnedEventsSection`
   - `tonightEvents` → `TonightHeroBanner` (omit section when empty — FR-003)
   - `upcomingEvents` / `recentEvents` → respective sections
3. Remove `pinnedRevision`, `isEventPinned`, `toggleEventPinned` imports.
4. `handlePinToggle`: call pin or unpin mutation based on current `event.isPinned`; wire optimistic update.
5. `handleCardActivate` / `handleQuickLink`: resolve `venueId` from card DTO (required for all-venues mode).
6. Empty states: `events.length === 0` → all four server arrays empty; retain existing copy.
7. Error/retry: refetch dashboard query on failure.

### Phase E — Tests and mocks (Constitution III)

1. Extend `mockWorkspaceFetch` with dashboard fixture map and pin mutation tracking.
2. `dashboard.test.ts`: query key, staleTime, pin invalidation, optimistic rollback.
3. Update `DashboardOverviewPage.test.tsx`:
   - Server partition rendering (no client partition)
   - Pin persists after refetch (not localStorage)
   - Venue switch refetches dashboard
   - Optimistic pin + failure rollback
4. Update `EventCard.test.tsx` for `hasVarianceConcern` / `unmappedCount` display.
5. Run coverage on touched files; verify ≥80%.

### Phase F — Cleanup

1. Remove overview imports of `partitionOverviewZones` and `pinnedEventStorage` (keep libs for other consumers/tests if any).
2. Do **not** delete `partitionOverviewZones.ts` — retain unit tests as regression for date rules until server tests fully supersede.

## Complexity Tracking

No constitution violations to justify.
