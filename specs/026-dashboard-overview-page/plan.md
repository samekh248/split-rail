# Implementation Plan: Dashboard Overview Page with Priority Zones

**Branch**: `026-dashboard-overview-page` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-dashboard-overview-page/spec.md` (Linear SPLR-66)

## Summary

Replace the interim `DashboardHome` auto-redirect with a **Dashboard Overview Page** at `/` that partitions the active venue's event list into four client-side priority zones—**pinned → tonight hero → upcoming → recent**—using pure date/pin helpers, renders each event via the shared **EventCard** (025), and navigates to the event workspace on card/quick-link activation. **Frontend-only**; reuses `useEvents(activeVenueId)`, `VenueSwitcher` in the workspace bar, existing empty-state patterns (minus create-event CTA), and `pinnedEventStorage` (localStorage). Vitest + RTL coverage ≥80% on new/modified files.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: `EventResponse` from `generated-api.ts`; `useEvents` / `useUserProfile` (TanStack Query); `useActiveVenue`; `EventCard` + `pinnedEventStorage` (025); `eventLifecycle.ts` date helpers; new `partitionOverviewZones.ts`; `navigateToEventWorkspace` / `navigateToCreateVenue` from `dashboardRoute.ts`; `useShellWorkspaceBar` + `VenueSwitcher` (same shell pattern as `EventWorkspacePage`)

**Storage**: `localStorage` via `pinnedEventStorage.ts` (025) for Phase 1 pins; no new persistence

**Testing**: Vitest + React Testing Library — `DashboardOverviewPage.test.tsx`, zone section tests, `partitionOverviewZones.test.ts`; migrate relevant cases from `DashboardHome.test.tsx`; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright deferred

**Target Platform**: Vite SPA — dashboard entry route `/` inside `AppShell`

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Single `useEvents` fetch per venue; zone partition is O(n) synchronous over event list; suitable for 50+ events without perceptible layout delay

**Constraints**: Constitution VI — no hand-written API types; Constitution III — Vitest coverage ≥80%; Constitution IX — Font Awesome in zone headings if icons used; no create-event on overview (clarification — creation only on `EventWorkspacePage`); today-dated events exclusive to hero (+ pinned overlap); pinned events may duplicate in date zones; empty zones show heading + minimal message; ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: ~1 new page, ~4 zone components, ~1 partition lib module, ~1 CSS block, route swap in `App.tsx`, retire `DashboardHome.tsx`, ~4–5 test files; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math on overview. | N/A |
| II. Multi-Tenant Isolation | `useEvents(activeVenueId)` is venue-scoped; overview shows active venue only. | PASS (existing API) |
| III. Engineering Rigor | Vitest + RTL for page, zones, partition lib; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration | No QBO calls; sync quick links navigate only. | PASS |
| V. Ledger State Machine | No ledger mutations from overview. | N/A |
| VI. Polyglot Contract | `EventResponse`, `PermissionsDto` from `generated-api.ts`. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | Partition skips invalid dates; pin storage try/catch already in `pinnedEventStorage`. | PASS |
| IX. UI Iconography | Zone headings may use FA icons (e.g. `faStar`, `faCalendar`); no hand-drawn SVGs. | PASS |

**Post-design re-check**: PASS. Frontend-only composition page; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/026-dashboard-overview-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── dashboard-overview-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── pages/
│   ├── DashboardOverviewPage.tsx        # NEW: overview shell + zone composition
│   └── DashboardHome.tsx                # DELETE or retire after route swap
├── components/dashboard/
│   ├── EventCard.tsx                    # EXISTING (025)
│   ├── TonightHeroBanner.tsx            # NEW: hero zone (all today-dated events)
│   ├── PinnedEventsSection.tsx          # NEW
│   ├── RecentEventsSection.tsx          # NEW
│   └── UpcomingEventsSection.tsx        # NEW
├── lib/
│   ├── partitionOverviewZones.ts        # NEW: client-side zone partition + sort
│   ├── eventLifecycle.ts                # EXISTING: date parse helpers; hero sort priority
│   └── pinnedEventStorage.ts            # EXISTING (025)
└── index.css                            # MODIFIED: dashboard-overview BEM block

apps/web/src/App.tsx                       # MODIFIED: `/` → DashboardOverviewPage

apps/web/tests/
├── pages/
│   ├── DashboardOverviewPage.test.tsx   # NEW: P1–P4 + empty/error states
│   └── DashboardHome.test.tsx           # DELETE or repoint after migration
├── components/dashboard/
│   ├── TonightHeroBanner.test.tsx       # NEW (optional, or covered in page test)
│   ├── PinnedEventsSection.test.tsx     # NEW (optional)
│   ├── RecentEventsSection.test.tsx     # NEW (optional)
│   └── UpcomingEventsSection.test.tsx   # NEW (optional)
└── lib/
    └── partitionOverviewZones.test.ts   # NEW: boundary matrix SC-003
```

**Structure Decision**: Single vertical slice through `apps/web`. Pure partition logic in `lib/partitionOverviewZones.ts`; presentational zone sections under `components/dashboard/`; page orchestrates data fetch, pin state, navigation callbacks, and workspace bar.

## Implementation Phases

### Phase A — Prerequisites (blocking)

1. Confirm **023** (workspace routes), **025** (`EventCard`, `pinnedEventStorage`), and **SPLR-64** (`eventLifecycle.ts`) are on the branch.
2. Verify `navigateToEventWorkspace` and `EventCard` `onQuickLink` contract.

### Phase B — Partition library (P3 core)

1. `partitionOverviewZones.ts`:
   - `filterTonightEvents(events, now)` — all events dated today, sorted by lifecycle phase priority then date.
   - `partitionRecentEvents(events, now)` — yesterday through 7 days ago, desc.
   - `partitionUpcomingEvents(events, now)` — tomorrow through 30 days ahead, asc.
   - `partitionPinnedEvents(events, venueId)` — filter by `isEventPinned`.
   - `partitionOverviewZones(events, venueId, now)` — returns `{ tonight, pinned, upcoming, recent }` with overlap rules per clarifications.
2. Unit tests: boundary dates (today, ±7d, ±30d), pin overlap, invalid dates, empty input.

### Phase C — Zone components (P2–P3)

1. Shared `DashboardZoneSection` props pattern: `title`, `emptyMessage`, `children` (event cards).
2. `TonightHeroBanner` — renders only when `tonight.length > 0`; maps `EventCard` list.
3. `PinnedEventsSection`, `RecentEventsSection`, `UpcomingEventsSection` — always render heading; show empty message or card list.
4. Wire pin toggle: parent holds pinned set state synced with `pinnedEventStorage` + `useState` refresh on toggle.

### Phase D — DashboardOverviewPage (P1, P4)

1. Replace `DashboardHome` redirect `useEffect` with overview render when events exist.
2. `useShellWorkspaceBar` with `VenueSwitcher` (+ optional Add venue button, matching workspace bar).
3. Loading / no-venue / no-events / events-error empty states — reuse `dashboard-empty` classes; **no** create-event CTA on no-events state.
4. `onQuickLink` → `navigateToEventWorkspace(activeVenueId, eventId, focus)`; card body click → same without focus.
5. `App.tsx`: render `DashboardOverviewPage` at `/` instead of `DashboardHome`.

### Phase E — Tests & styling (all priorities)

1. Page tests: overview visible (not redirect), zone order, hero visibility, empty messages, navigation mocks, venue switch repartition.
2. Partition tests: full SC-003 matrix.
3. CSS: zone spacing, hero emphasis, responsive card grid.
4. Remove or migrate `DashboardHome.test.tsx`; ensure global coverage ≥80%.

## Complexity Tracking

> Not required — no constitution violations.
