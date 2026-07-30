# Implementation Plan: Venues Page Region/Venue Visual Organization

**Branch**: `079-venue-region-layout` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/079-venue-region-layout/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The Venues page currently shows region-grouping controls (region filter, "By region"/"List" toggle, "Manage regions" button, helper text) and a grouped-view component regardless of whether the organization has any regions defined, so an org with zero regions sees a disjointed set of controls and a meaningless single "Unassigned" group. This feature removes region-grouping affordances entirely when zero regions exist (rendering a single unified list plus one integrated create-regions prompt for managers), and improves visual separation between region groups (and the unassigned bucket) in the grouped view once regions do exist. This is a frontend-only presentation change: `VenuesPage.tsx`, `VenuesPageControls.tsx`, `VenueListGrouped.tsx`, `venueListView.ts`, and `index.css` are updated; no API, DTO, or data-model changes are required.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3), consuming the existing ASP.NET Core 8 / C# API (unchanged by this feature)

**Primary Dependencies**: React, @tanstack/react-query (existing `useRegions`, `useActiveVenue` hooks), existing `venueListView.ts` selectors, Font Awesome Free (Constitution §IX) for any new iconography

**Storage**: N/A — no persistence changes; reuses existing `Venue`/`Region` API data already fetched on this page

**Testing**: Vitest + React Testing Library for `VenuesPage`, `VenuesPageControls`, `VenueListGrouped`, and `venueListView` unit/component tests; ≥80.0% line/branch coverage gate enforced via `apps/web` Vitest coverage config (Constitution III)

**Target Platform**: Web (desktop and mobile browser widths already supported by the existing responsive layout)

**Project Type**: Web application (existing `apps/web` frontend + `apps/api` backend monorepo) — this feature only touches `apps/web`

**Performance Goals**: No new performance targets; page must not introduce a visible layout shift once region/venue data resolves (spec SC-004)

**Constraints**: ≥80.0% line/branch coverage on the touched frontend code (Constitution III); no new TypeScript interfaces hand-mirrored from the API — reuse `VenueResponse`/`RegionResponse` from `src/types/generated-api.ts` (Constitution VI); no backend/API/DTO changes; no new region-creation workflow (reuses existing `RegionManagementPanel`)

**Scale/Scope**: Single page (`VenuesPage`) and its four direct child components/selectors; no new routes, entities, or endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. Core Mathematical Axioms | N/A | No monetary computation involved. |
| II. Multi-Tenant Isolation | N/A | No new data queries; reuses existing tenant-scoped `useRegions`/`useActiveVenue` hooks. |
| III. Engineering Rigor & Quality Gates | Applies | Vitest + RTL component/unit tests required for all modified components/selectors; ≥80% coverage on touched frontend code. |
| IV. QBO Integration Boundaries | N/A | No QBO interaction. |
| V. Ledger State Machine & Immutability | N/A | No `events`/`event_artists`/`financial_line_items` mutation. |
| VI. Polyglot Contract & Serialization | Applies | Continue using `VenueResponse`/`RegionResponse` from `generated-api.ts`; no hand-written mirrored types. |
| VII. EF Core Axioms | N/A | No backend/EF Core changes. |
| VIII. Exception Governance & Logging Privacy | N/A | No new exception paths or logging. |
| IX. UI Iconography | Applies | Any new icon (e.g., for the create-regions prompt) must use Font Awesome Free per existing usage on this page. |
| X. Dual-Platform Operator Scripts | N/A | No `deploy/` scripts added. |

**Result**: PASS — no violations; no entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── pages/
│   │   └── VenuesPage.tsx                     # Orchestrates data + decides layout mode
│   ├── components/venue/
│   │   ├── VenuesPageControls.tsx              # Region filter / display toggle / manage-regions / helper text
│   │   ├── VenueList.tsx                       # Flat list (unchanged behavior, reused as the "unified list")
│   │   └── VenueListGrouped.tsx                # Grouped-by-region rendering
│   ├── lib/
│   │   ├── venueListView.ts                    # buildGroupedSections/buildRegionFilterOptions selectors
│   │   └── venueListViewStorage.ts             # Saved display-mode/region-filter preference (existing)
│   └── index.css                               # .venues-page-controls*, .venues-group*, .venues-table* rules
└── tests/
    ├── pages/VenuesPage.test.tsx
    ├── components/venue/VenuesPageControls.test.tsx
    ├── components/venue/VenueListGrouped.test.tsx
    └── lib/venueListView.test.ts

apps/api/                                        # Unchanged — no backend work in this feature
```

**Structure Decision**: Existing `apps/web` frontend project (React + Vite + Vitest), no new packages or projects. All changes are confined to the Venues page and its existing child components/selectors listed above; `apps/api` is untouched since no data-model or contract changes are needed.

## Complexity Tracking

*No Constitution violations — this section is not applicable.*
