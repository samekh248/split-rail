# Implementation Plan: Split Dashboard Routes and Event Workspace

**Branch**: `023-split-dashboard-routes` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-split-dashboard-routes/spec.md` (Linear SPLR-63)

## Summary

Split the monolithic dashboard at `/` into **URL-addressable event workspaces** at `/venues/:venueId/events/:eventId` by extracting today's `DashboardHome` ledger workspace into `EventWorkspacePage`, extending the History API routing layer, and keeping `/` as an interim entry that redirects to a resolved workspace or shows existing empty states. **Frontend-only** — no API or schema changes. Global nav, settings return paths, and Vitest suites updated to treat workspace routes as Dashboard-scoped.

## Technical Context

**Language/Version**: TypeScript 5.7 + React 18 (`apps/web` only)

**Primary Dependencies**: Existing History API routing (`appRoute.ts`, `dashboardRoute.ts` re-exports); TanStack Query (`useEvents`, `useVenues`); `VenueContext` + `activeVenueStorage` / `activeEventStorage`; `resolveActiveEventId` from `venue/eventSelection.ts`; AppShell from SPLR-62

**Storage**: Browser `sessionStorage` for active venue/event (existing); URL is source of truth on workspace load; session storage updated on in-app navigation

**Testing**: Vitest + React Testing Library for routing helpers, `EventWorkspacePage`, slim `DashboardHome` entry, `globalNav` active matching, and `settingsReturnStorage`; ≥80.0% line/branch coverage on touched frontend files (Constitution III); no backend changes; Playwright E2E updates deferred to SPLR-68

**Target Platform**: Vite SPA — same History API navigation model as 022-vertical-navigation

**Project Type**: Web application (`apps/web` vertical slice; `apps/api` unchanged)

**Performance Goals**: Workspace URL load and event-switch navigation feel identical to today's dashboard (no full page reload; History API `pushState` only)

**Constraints**: Constitution VI — no hand-written API types; Constitution III — Vitest coverage ≥80% on new/modified frontend files; reuse existing event CRUD permission rules from SPLR-58; workspace `?focus=` scroll behavior deferred to SPLR-67; multi-zone overview at `/` deferred to SPLR-66; ≥80.0% coverage gate on frontend touched files (backend N/A)

**Scale/Scope**: ~2 new lib modules, ~2 pages (extract + slim entry), ~6 modified files (`App.tsx`, `appRoute.ts`, `globalNav.ts`, `settingsReturnStorage.ts`, tests), ~4 new/extended test files; 0 backend files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | No monetary math in routing layer. | N/A |
| II. Multi-Tenant Isolation | Venue/event access validated against user's venue list and venue-scoped event queries (existing APIs). | PASS (with validation logic) |
| III. Engineering Rigor | Vitest + RTL for routing + workspace page; ≥80% on touched frontend files. | PASS (with tests) |
| IV. QBO Integration | No QBO interaction. | N/A |
| V. Ledger State Machine | No ledger mutations; event CRUD rules unchanged. | N/A |
| VI. Polyglot Contract | Read-only use of `EventResponse`, `VenueResponse`; no new TS API types. | PASS |
| VII. EF Core Axioms | No backend queries. | N/A |
| VIII. Exception Governance | Invalid URL fallbacks with user-visible messages; no empty catches. | PASS |
| IX. UI Iconography | No new icons required. | N/A |

**Post-design re-check**: PASS. Frontend-only routing refactor; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/023-split-dashboard-routes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── event-workspace-routing.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── appRoute.ts                    # MODIFIED: workspace path parse/build; AppPath union extended
│   ├── eventWorkspaceRoute.ts         # NEW: navigateToEventWorkspace, navigateToDashboard, focus stub
│   ├── dashboardRoute.ts              # MODIFIED: re-export workspace helpers
│   ├── globalNav.ts                   # MODIFIED: workspace path pattern matching for active state
│   └── settingsReturnStorage.ts       # MODIFIED: persist workspace return paths
├── pages/
│   ├── EventWorkspacePage.tsx         # NEW: extracted from DashboardHome (ledger workspace)
│   └── DashboardHome.tsx              # MODIFIED: interim entry — redirect or empty states only
└── App.tsx                            # MODIFIED: route EventWorkspacePage on workspace path

apps/web/tests/
├── lib/
│   ├── appRoute.test.ts               # EXTENDED: workspace path parsing and navigation
│   ├── eventWorkspaceRoute.test.ts    # NEW
│   └── settingsReturnStorage.test.ts  # EXTENDED: workspace return capture
├── pages/
│   ├── EventWorkspacePage.test.tsx    # NEW (migrated from DashboardHome.test.tsx)
│   └── DashboardHome.test.tsx         # MODIFIED: entry redirect / empty-state only
└── shell/
    └── GlobalNav.test.tsx             # EXTENDED: active state on workspace URL
```

**Structure Decision**: Single vertical slice through `apps/web`. Workspace routing helpers colocated under `lib/`. `App.tsx` adds a branch for `parseEventWorkspacePath(getAppPath())` before the existing dashboard fallback. No React Router dependency.

## Implementation Phases

### Phase A — Routing primitives (P1)

1. Add `parseEventWorkspacePath`, `buildEventWorkspacePath`, `isEventWorkspacePath` to `appRoute.ts`.
2. Extend `AppPath` / `getAppPath()` to recognize workspace paths; add `useEventWorkspaceRoute()` hook returning `{ venueId, eventId } | null`.
3. Create `eventWorkspaceRoute.ts` with `navigateToEventWorkspace(venueId, eventId, focus?)` and re-export `navigateToDashboard`.
4. Unit tests for parse/build/navigate and popstate behavior.

### Phase B — Extract EventWorkspacePage (P1–P2)

1. Copy `DashboardHome` workspace body into `EventWorkspacePage.tsx`.
2. Read `venueId` / `eventId` from URL hook; on mount call `activateVenueId(venueId)` when URL venue differs from context.
3. Replace local `selectedEventId` state driver: URL is canonical; `handleSelectEvent` calls `navigateToEventWorkspace`.
4. On venue switch (effect watching `activeVenueId` vs URL): load events, resolve default event, `navigateToEventWorkspace`.
5. On create/delete success: navigate to new/remaining event URL.
6. Invalid URL handling: inaccessible venue → message + `navigateToDashboard()`; unknown event → resolve default + replace URL.

### Phase C — Dashboard entry + App wiring (P4)

1. Slim `DashboardHome` to interim entry: wait for venues/events, redirect to `buildEventWorkspacePath(activeVenueId, resolvedEventId)` when events exist; retain no-venue / no-events empty states at `/`.
2. Update `App.tsx`: workspace path → `EventWorkspacePage`; `/` → `DashboardHome`; `/venues/new` unchanged.
3. Update `captureSettingsReturnPath` to store full workspace path string.

### Phase D — Global nav active matching (P3)

1. Replace exact `matchPaths.includes` with `matchesGlobalNavPath(item, pathname)` supporting workspace prefix `/venues/*/events/*`.
2. `navigateToDashboard()` continues targeting `/` (entry redirect handles workspace reachability).
3. Extend `GlobalNav.test.tsx` for workspace URL highlighting.

### Phase E — Verification

1. Migrate and extend Vitest suites (`EventWorkspacePage.test.tsx`, routing tests).
2. Run manual quickstart scenarios A–F.
3. Confirm ≥80% coverage on touched frontend files.

## Complexity Tracking

> Not required — no constitution violations.

## Generated Artifacts

| Artifact | Path |
|----------|------|
| Implementation plan | [plan.md](./plan.md) |
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| UI/routing contracts | [contracts/event-workspace-routing.md](./contracts/event-workspace-routing.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
