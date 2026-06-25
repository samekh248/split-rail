# Implementation Plan: Unified Booking Calendar Engine

**Branch**: `074-unified-booking-calendar` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/073-unified-booking-calendar/spec.md`

## Summary

Deliver a full **Booking Calendar** module at `/booking`: introduce **Region** entities and **Venue.regionId** assignment; extend **Event** with **booking placement status** (Hold 1, Hold 2, Confirmed, Cancelled), optional schedule times, and support lineup; add org-scoped **calendar placements read API** and **BookingConflictService** for server-side conflict validation; build **Global / Regional / Single-venue** matrix UI with **daily agenda drawer**, **create hold/event modals**, **event control panel**, and **mobile stream** layout. Enable global nav item (retire spec 037 placeholder). Replace dashboard **hash-based booking badge** (spec 025) with live status. Holds block financial workspace until promoted; Cancelled slots do not block new placements; promotion does not auto-release sibling holds.

## Technical Context

**Language/Version**: C# / .NET 8 (`apps/api`), TypeScript 5.7 + React 18.3 (`apps/web`), PostgreSQL via EF Core migrations.

**Primary Dependencies**: Existing `Event`, `Venue`, `VenueService`, `EventService`, `FrozenEventMutationAuditor`; React Query hooks pattern (`apps/web/src/api/`); `upcomingEventsCalendar.ts` grid patterns (spec 038); `UnassignedTransactionsDrawer` a11y pattern (spec 035); MHC design tokens (`apps/web/src/theme/tokens.ts`); Font Awesome Free for nav/calendar controls (Constitution IX).

**Storage**: PostgreSQL — new `regions` table; `venues.region_id` nullable FK; `events` columns for `booking_placement_status`, `doors_time`, `load_in_time`, `curfew_time`, `support_lineup`; migration backfills existing events → `CONFIRMED`.

**Testing**: xUnit + WebApplicationFactory/Testcontainers for regions, calendar query tenant isolation, conflict matrix, cancel/delete guards; Vitest + RTL for `bookingCalendar.ts`, matrix, modals, drawers, mobile breakpoint; Playwright E2E for create hold → promote → workspace, region filter, cancelled toggle; ≥80.0% line/branch coverage on all new/modified backend and frontend files (Constitution III).

**Target Platform**: Vite SPA + ASP.NET Core API; desktop matrix ≥768px; mobile stream <768px.

**Project Type**: Full-stack web application — backend domain + API + frontend page module.

**Performance Goals**: Calendar month query <500ms p95 for orgs with ≤30 venues; client filter/view switch <1s (SC-002); single org-scoped placements query (no N-venue fan-out).

**Constraints**: Constitution II org scoping on all queries; V immutability on settled/reconciled; VI generated-api types only; IV QBO read-only; FR-015 holds blocked from workspace; ≥80.0% coverage gate; no deploy script changes (§X N/A).

**Scale/Scope**: ~4 new backend services/controllers, 1 EF migration, ~12 frontend components, ~3 API hook modules, 1 page route, 4 contract docs, ~15 test files; supersede spec 037 booking placeholder and spec 025 booking badge preview.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applicable? | Status | Notes |
|---|-----------|-------------|--------|-------|
| I | Core Mathematical Axioms | No | PASS (N/A) | No monetary math in calendar module. |
| II | Multi-Tenant Isolation | **Yes** | PASS | All region/calendar/event queries scoped by `organization_id` + `VenueService` access filter. |
| III | Engineering Rigor | **Yes — primary** | PASS | xUnit + Vitest + Playwright; ≥80% coverage on touched files. |
| IV | QBO Integration | Partial | PASS | Display `qboTagName` only; no QBO writes. |
| V | Ledger State Machine | **Yes** | PASS | `FrozenEventMutationAuditor` on calendar edits; holds skip workspace. |
| VI | Polyglot Contract | **Yes** | PASS | DTOs in C# → regenerate `generated-api.ts`. |
| VII | EF Core Axioms | **Yes** | PASS | Calendar query uses `.Include()` + `.AsNoTracking()`. |
| VIII | Exception Governance | Yes | PASS | `BookingConflictException` → 409; domain exceptions only. |
| IX | UI Iconography | Yes | PASS | FA icons for calendar nav, create, month controls. |
| X | Dual-Platform Scripts | No | PASS (N/A) | No deploy scripts. |

**Gate result (pre-design)**: All gates PASS. No violations.

**Gate result (post-design)**: Unchanged. See [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/).

## Project Structure

### Documentation (this feature)

```text
specs/073-unified-booking-calendar/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── regions-api.md
│   ├── calendar-placements-api.md
│   ├── booking-conflicts.md
│   └── booking-calendar-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/api/
├── Models/
│   ├── Region.cs                              # NEW
│   ├── Venue.cs                               # MODIFY — RegionId
│   ├── Event.cs                               # MODIFY — booking + schedule fields
│   └── Enums/BookingPlacementStatus.cs        # NEW
├── Services/
│   ├── RegionService.cs                       # NEW
│   ├── CalendarService.cs                     # NEW
│   ├── BookingConflictService.cs              # NEW
│   ├── EventService.cs                        # MODIFY — booking fields, cancel, hold delete
│   └── VenueService.cs                        # MODIFY — region validation
├── Controllers/
│   ├── RegionsController.cs                   # NEW
│   └── CalendarController.cs                  # NEW
├── DTOs/Regions/                                # NEW
├── DTOs/Calendar/                               # NEW
├── Data/Migrations/*_AddRegionsAndBookingPlacement.cs  # NEW
└── Tests/                                       # NEW test classes

apps/web/src/
├── pages/BookingCalendarPage.tsx              # NEW
├── components/booking/                          # NEW — matrix, mobile, drawers, modals, controls
├── lib/bookingCalendar.ts                     # NEW
├── lib/appRoute.ts                            # MODIFY — /booking
├── lib/globalNav.ts                           # MODIFY — enable booking nav
├── lib/eventCardLabels.ts                     # MODIFY — real status
├── api/regions.ts                               # NEW
├── api/calendar.ts                              # NEW
├── api/events.ts                                # MODIFY — booking fields
├── components/venue/CreateVenuePage.tsx         # MODIFY — region dropdown
├── components/venue/VenueEditModal.tsx          # MODIFY — region dropdown
├── App.tsx                                      # MODIFY — route
└── index.css                                    # MODIFY — booking-calendar styles

apps/web/tests/booking/                          # NEW
tests/e2e/specs/booking/                         # NEW Playwright specs
```

**Structure Decision**: Full-stack slice. Backend owns conflict rules and tenant-scoped calendar read. Frontend owns view-mode filtering client-side after single month fetch. Reuse drawer a11y from `UnassignedTransactionsDrawer`; extend `upcomingEventsCalendar.ts` date-grid helpers into `bookingCalendar.ts` for full-month multi-venue matrix.

## Implementation Phases

### Phase A — Data model & migration

1. Add `Region`, `BookingPlacementStatus`, extend `Venue`/`Event`; EF migration with backfill `CONFIRMED`.
2. Regenerate OpenAPI → `generated-api.ts`.

### Phase B — Backend APIs

1. `RegionService` + `RegionsController` CRUD.
2. `BookingConflictService` with clarified conflict matrix (see [contracts/booking-conflicts.md](./contracts/booking-conflicts.md)).
3. `CalendarService` + `GET /api/calendar/placements`.
4. Extend `EventService` create/update/delete/cancel/promote paths.

### Phase C — Frontend routing & data layer

1. `/booking` route, enable `globalNav` booking item.
2. `useRegions`, `useCalendarPlacements`, extend event mutations.
3. `bookingCalendar.ts` pure helpers (grouping, sort, client conflict preview).

### Phase D — Calendar UI

1. `BookingCalendarPage` shell — Global default, month nav, filters, cancelled toggle.
2. `BookingCalendarMatrix` (desktop) + `BookingCalendarMobileStream`.
3. `BookingDailyAgendaDrawer`, `BookingEventDrawer`, create modals, `RegionManagementPanel`.
4. Venue forms — required region dropdown.

### Phase E — Integration polish

1. Replace `eventCardLabels` placeholder; extend dashboard DTO if needed.
2. Block workspace navigation for holds in `eventWorkspaceRoute` or workspace page guard.
3. CSS with MHC tokens and status modifiers.

### Phase F — Tests & coverage

1. xUnit conflict matrix + tenant isolation.
2. Vitest component/lib suite.
3. Playwright happy paths per [quickstart.md](./quickstart.md).

## Complexity Tracking

No constitution violations requiring justification.
