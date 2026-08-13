# Implementation Plan: Header Venue Dropdown Region Filter

**Branch**: `080-header-venue-region-filter` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/080-header-venue-region-filter/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The header `VenueSwitcher` dropdown (spec 009) currently renders a flat, unfiltered list of every venue the user can access plus an "All Venues" option. This feature adds a region filter/grouping affordance inside that same popover — reusing the `filterVenuesByRegion`/`buildRegionFilterOptions`/`buildGroupedSections` selectors already built for the Venues admin page (spec 075/079) — so users with venues spread across regions can narrow or visually group the list by region. Selecting a venue (filtered or not) still goes through the exact same `setActiveVenue`/`activateVenueId` path as today; no change to the active-venue scoping model. This is a frontend-only presentation change confined to `VenueSwitcher.tsx`, `venueListView.ts` (consumed, not modified), and `index.css`; no API, DTO, or data-model changes are required.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3), consuming the existing ASP.NET Core 8 / C# API (unchanged by this feature)

**Primary Dependencies**: React, @tanstack/react-query (existing `useVenues`/`useRegions`/`useActiveVenue` hooks), existing `venueListView.ts` selectors (`filterVenuesByRegion`, `buildRegionFilterOptions`, `buildGroupedSections`), Font Awesome Free (Constitution §IX) if any new iconography is needed for the chevron/empty state

**Storage**: N/A — no persistence changes; the region filter is transient component state, not written to `sessionStorage`/cookies (see [research.md](./research.md) D5)

**Testing**: Vitest + React Testing Library for `VenueSwitcher`; ≥80.0% line/branch coverage gate enforced via `apps/web` Vitest coverage config (Constitution III)

**Target Platform**: Web (desktop and mobile browser widths already supported by the existing header layout)

**Project Type**: Web application (existing `apps/web` frontend + `apps/api` backend monorepo) — this feature only touches `apps/web`

**Performance Goals**: No new performance targets; opening the dropdown must not introduce a new network round-trip beyond the already-mounted `useVenues`/`useRegions` queries

**Constraints**: ≥80.0% line/branch coverage on the touched frontend code (Constitution III); no new TypeScript interfaces hand-mirrored from the API — reuse `VenueResponse`/`RegionResponse` from `src/types/generated-api.ts` (Constitution VI); no backend/API/DTO changes; no change to the active-venue scoping model (spec 009) or to the Venues admin page's own filter/grouping (spec 075/079)

**Scale/Scope**: Single shared component (`VenueSwitcher`) rendered in three page shells (`EventWorkspacePage`, `DashboardOverviewPage`, `AccountingOverviewPage`); no new routes, entities, or endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. Core Mathematical Axioms | N/A | No monetary computation involved. |
| II. Multi-Tenant Isolation | N/A | No new data queries; reuses existing tenant-scoped `useVenues`/`useRegions`/`useActiveVenue` hooks, unchanged. |
| III. Engineering Rigor & Quality Gates | Applies | Vitest + RTL component tests required for `VenueSwitcher`'s new filter/grouping branches; ≥80% coverage on touched frontend code. |
| IV. QBO Integration Boundaries | N/A | No QBO interaction. |
| V. Ledger State Machine & Immutability | N/A | No `events`/`event_artists`/`financial_line_items` mutation. |
| VI. Polyglot Contract & Serialization | Applies | Continue using `VenueResponse`/`RegionResponse` from `generated-api.ts`; no hand-written mirrored types. |
| VII. EF Core Axioms | N/A | No backend/EF Core changes. |
| VIII. Exception Governance & Logging Privacy | N/A | No new exception paths or logging. |
| IX. UI Iconography | Applies | Any new icon (e.g., empty-state or filter affordance) must use Font Awesome Free per existing usage. |
| X. Dual-Platform Operator Scripts | N/A | No `deploy/` scripts added. |

**Result**: PASS — no violations; no entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/080-header-venue-region-filter/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/venue/
│   │   └── VenueSwitcher.tsx           # Adds region filter control + grouped option rendering
│   ├── venue/
│   │   ├── VenueContext.tsx             # Unchanged — still supplies venues/activeVenueId
│   │   └── useActiveVenue.ts            # Unchanged
│   ├── lib/
│   │   └── venueListView.ts             # Reused as-is: filterVenuesByRegion, buildRegionFilterOptions, buildGroupedSections
│   ├── api/
│   │   └── regions.ts                   # Reused as-is: useRegions()
│   └── index.css                        # New `.venue-switcher__region-filter`, `.venue-switcher__section-*` rules
└── tests/
    └── venue/
        └── VenueSwitcher.test.tsx        # Extended with region filter/grouping coverage

apps/api/                                  # Unchanged — no backend work in this feature
```

**Structure Decision**: Existing `apps/web` frontend project (React + Vite + Vitest), no new packages or projects. All changes are confined to `VenueSwitcher.tsx` and its stylesheet rules; `venueListView.ts` and `regions.ts` are consumed unmodified since they already expose everything this feature needs. `apps/api` is untouched since no data-model or contract changes are needed.

## Complexity Tracking

*No Constitution violations — this section is not applicable.*
