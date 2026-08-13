# Implementation Plan: Venue Drag-and-Drop Region Reassignment & Region Deletion Handling

**Branch**: `081-venue-drag-drop-regions` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/081-venue-drag-drop-regions/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Four related changes to the Venues admin page: (1) drag-and-drop reassignment of a venue to a different region via a left-side handle on each grouped-view row, reusing the existing single-venue `PUT /venues/{id}` endpoint — no new backend work; (2) a resolution prompt when deleting a region that still has assigned venues, letting the admin either delete those venues along with the region or move them all to one other region — this **does** require extending the backend `DeleteRegionAsync`/`DELETE /regions/{id}` contract, since today it hard-blocks deletion whenever a region has venues; (3) replacing the per-region "Add venue" page-navigation flow (added in spec 080) with an in-page modal, which also means retiring the now-unused `/venues/new` route, `CreateVenuePage`, and its navigation helpers; (4) a CSS-only right-alignment fix for the grouped table's Actions column.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3) for the frontend; C# / .NET 8 (ASP.NET Core, EF Core) for the backend region-deletion extension

**Primary Dependencies**: React, @tanstack/react-query (existing `useVenues`/`useUpdateVenue`/`useRegions`/`useDeleteRegion` hooks), native HTML5 Drag and Drop API (no new npm dependency — matches this codebase's existing pattern of hand-built interactive widgets with zero UI-kit dependencies), `@fortawesome/free-solid-svg-icons` (`faGripVertical` for the new drag handle, Constitution §IX); EF Core (existing `ApplicationDbContext`) for the region-deletion resolution logic

**Storage**: PostgreSQL via existing EF Core `Venue`/`Region` tables — no schema/migration changes; venue reassignment and the region-deletion resolution both operate on the existing nullable `Venue.RegionId` foreign key

**Testing**: xUnit + `IntegrationTestBase`/WebApplicationFactory for the new `RegionsController`/`RegionService` deletion-resolution behavior (no existing Regions backend tests today — this feature adds the first ones); Vitest + React Testing Library for the frontend (drag-and-drop simulated via `fireEvent.dragStart`/`dragOver`/`drop`, avoiding jsdom's unimplemented `DataTransfer` by keeping the dragged-venue id in component state rather than `event.dataTransfer`); ≥80.0% line/branch coverage gate enforced independently per stack via CI (Constitution III)

**Target Platform**: Web (desktop/mouse-oriented for the drag-and-drop interaction specifically, per spec Assumptions; the rest of the feature works across the existing responsive breakpoints)

**Project Type**: Web application (existing `apps/web` frontend + `apps/api` backend monorepo) — this feature touches both

**Performance Goals**: No new performance targets; a drag-and-drop reassignment completes in one `PUT /venues/{id}` round trip, and a region-deletion resolution completes in one `DELETE /regions/{id}` round trip (single atomic `SaveChangesAsync`, avoiding a two-request split-brain risk)

**Constraints**: ≥80.0% line/branch coverage on backend and frontend independently (Constitution III); no hand-written TypeScript interfaces mirroring API payloads — the new `DeleteRegionRequest` DTO is defined in C# first, then `npm run gen:api` regenerates `generated-api.ts` (Constitution VI); all EF Core queries touching `Venue`/`Region` remain organization-scoped (Constitution II), including validating that a "move venues to" destination region belongs to the same organization; Font Awesome Free only for the new drag handle icon (Constitution IX); no `deploy/` scripts added (Constitution §X N/A)

**Scale/Scope**: `VenuesPage.tsx` and its child components (`VenueListGrouped.tsx`, `VenuesPageControls.tsx` unaffected), two new frontend modal components (`AddVenueModal`, a region-deletion resolution modal), removal of `CreateVenuePage.tsx` and its route; one backend service (`RegionService`) and controller (`RegionsController`) endpoint extended, one new request DTO; no new database tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. Core Mathematical Axioms | N/A | No monetary computation involved. |
| II. Multi-Tenant Isolation | Applies | `DeleteRegionAsync`'s new "move venues to region X" path MUST validate the destination region belongs to the same `organizationId` as the region being deleted, reusing the existing org-scoping pattern already used elsewhere in `RegionService`. |
| III. Engineering Rigor & Quality Gates | Applies | New xUnit integration tests for `RegionsController`/`RegionService` deletion-resolution paths (first Regions backend tests in the repo); Vitest + RTL for the two new modals and the grouped-list drag-and-drop; ≥80% coverage on touched files in both stacks. |
| IV. QBO Integration Boundaries | N/A | No QBO interaction. |
| V. Ledger State Machine & Immutability | N/A | No `events`/`event_artists`/`financial_line_items` mutation; venue deletion (via the "delete venues too" choice) already permanently removes a venue's events today with no immutability guard, per existing `DeleteVenueConfirm` behavior — this feature does not change that. |
| VI. Polyglot Contract & Serialization | Applies | New `DeleteRegionRequest` DTO defined in `apps/api/DTOs/Regions/RegionDtos.cs` first; frontend regenerates and imports it from `generated-api.ts`, no hand-written mirror. |
| VII. EF Core Axioms | Applies | The bulk venue reassignment/deletion inside `DeleteRegionAsync` uses the already-loaded `region.Venues` (via `.Include(r => r.Venues)`, existing pattern) and a single `SaveChangesAsync` call for atomicity; read paths continue to use `.AsNoTracking()` where already established. |
| VIII. Exception Governance & Logging Privacy | Applies | New validation failures (invalid/foreign-org destination region, deleting into itself) throw the existing typed `ValidationException`/`NotFoundException`, not a generic exception; no new logging of sensitive data. |
| IX. UI Iconography | Applies | New `faGripVertical` icon (Font Awesome Free) for the drag handle, imported per-icon per existing convention. |
| X. Dual-Platform Operator Scripts | N/A | No `deploy/` scripts added. |

**Result**: PASS — no violations; no entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/081-venue-drag-drop-regions/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/
├── DTOs/Regions/RegionDtos.cs                       # New DeleteRegionRequest record
├── Services/RegionService.cs                        # DeleteRegionAsync extended with resolution logic
├── Controllers/RegionsController.cs                 # DELETE endpoint accepts optional request body
└── apps/api.tests/
    ├── Integration/RegionsControllerTests.cs         # New — first Regions backend tests
    └── Unit/RegionServiceTests.cs                    # New (if unit-level coverage is more direct than integration for validation branches)

apps/web/
├── src/
│   ├── components/venue/
│   │   ├── VenueListGrouped.tsx                      # Drag handle, drag/drop handlers, Actions column right-align
│   │   ├── AddVenueModal.tsx                          # New — region-scoped create-venue modal (replaces CreateVenuePage)
│   │   └── RegionDeleteResolutionModal.tsx            # New — delete-venues-too / move-to-one-region prompt
│   ├── components/booking/RegionManagementPanel.tsx   # Wires delete button to the new resolution modal when venueCount > 0
│   ├── pages/VenuesPage.tsx                           # Opens AddVenueModal instead of navigating; no CreateVenuePage import
│   ├── pages/CreateVenuePage.tsx                      # Removed
│   ├── api/regions.ts                                 # useDeleteRegion signature extended; invalidates venues query too
│   ├── api/venues.ts                                  # Unchanged — useUpdateVenue reused as-is for drag-and-drop
│   ├── lib/appRoute.ts, lib/dashboardRoute.ts          # navigateToCreateVenue/getCreateVenueRegionIdFromUrl removed
│   ├── App.tsx                                         # /venues/new route removed
│   └── index.css                                       # Drag handle, drag-over, right-aligned actions, add-venue-modal styles
└── tests/
    ├── components/venue/VenueListGrouped.test.tsx
    ├── components/venue/AddVenueModal.test.tsx
    ├── components/venue/RegionDeleteResolutionModal.test.tsx
    ├── components/booking/RegionManagementPanel.test.tsx
    ├── pages/VenuesPage.test.tsx
    ├── pages/CreateVenuePage.test.tsx                  # Removed
    └── lib/appRoute.test.ts, lib/dashboardRoute.test.ts # navigateToCreateVenue/getCreateVenueRegionIdFromUrl tests removed
```

**Structure Decision**: Existing `apps/web` (React + Vite + Vitest) and `apps/api` (ASP.NET Core + xUnit) projects, no new packages or projects. Backend work is confined to the Regions vertical slice (DTO, service, controller, tests); frontend work is confined to the Venues page and its region/venue components. `CreateVenuePage.tsx` and its route are removed rather than left as dead, unreachable code.

## Complexity Tracking

*No Constitution violations — this section is not applicable.*
