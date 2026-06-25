---
description: "Task list for Unified Booking Calendar Engine"
---

# Tasks: Unified Booking Calendar Engine

**Input**: Design documents from `/specs/073-unified-booking-calendar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds failing tests first, then implementation until green. Final Polish phase enforces ≥80.0% line/branch coverage on **backend** (`dotnet test` + coverlet → cobertura) and **frontend** (`npm run test:coverage` → lcov) independently.

**Organization**: Tasks grouped by user story (US1–US10). Full-stack paths under `apps/api/` and `apps/web/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US10 (maps to spec.md user stories)
- All paths are repo-relative

## Path Conventions

- API models: `apps/api/Models/`, `apps/api/Models/Enums/`
- API services: `apps/api/Services/`
- API controllers: `apps/api/Controllers/`
- API DTOs: `apps/api/DTOs/Regions/`, `apps/api/DTOs/Calendar/`, `apps/api/DTOs/Ledger/LedgerDtos.cs`
- API tests: `apps/api.Tests/` (or existing test project path)
- Web page: `apps/web/src/pages/BookingCalendarPage.tsx`
- Web components: `apps/web/src/components/booking/`
- Web lib: `apps/web/src/lib/bookingCalendar.ts`, `appRoute.ts`, `globalNav.ts`, `eventCardLabels.ts`
- Web API hooks: `apps/web/src/api/regions.ts`, `calendar.ts`, `events.ts`
- Web tests: `apps/web/tests/booking/`, `apps/web/tests/lib/bookingCalendar.test.ts`
- E2E: `tests/e2e/specs/booking/`
- Contracts: `specs/073-unified-booking-calendar/contracts/`
- Types: `apps/web/src/types/generated-api.ts` (regenerate only — no manual edits)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, contracts, and project wiring before implementation.

- [X] T001 Verify branch `074-unified-booking-calendar` and design docs in `specs/073-unified-booking-calendar/` per plan.md
- [X] T002 [P] Review API contracts in `specs/073-unified-booking-calendar/contracts/regions-api.md`, `calendar-placements-api.md`, and `booking-conflicts.md`
- [X] T003 [P] Review UI contract in `specs/073-unified-booking-calendar/contracts/booking-calendar-ui.md` (testids, status modifiers, drawer behavior)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, conflict engine, shared DTOs, and pure calendar helpers. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] Write failing xUnit tests for conflict matrix cases in `apps/api.Tests/Services/BookingConflictServiceTests.cs` per `specs/073-unified-booking-calendar/contracts/booking-conflicts.md`
- [ ] T005 [P] Write failing unit tests for `getMonthBounds`, `groupPlacementsByDateAndVenue`, `previewConflict`, and `sortAgendaPlacements` in `apps/web/tests/lib/bookingCalendar.test.ts`

### Implementation for Foundational

- [ ] T006 [P] Add `BookingPlacementStatus` enum in `apps/api/Models/Enums/BookingPlacementStatus.cs`
- [ ] T007 [P] Add `Region` model in `apps/api/Models/Region.cs` per `specs/073-unified-booking-calendar/data-model.md`
- [ ] T008 Extend `Venue` with `RegionId` in `apps/api/Models/Venue.cs`
- [ ] T009 Extend `Event` with booking and schedule fields in `apps/api/Models/Event.cs`
- [ ] T010 Configure EF relationships and indexes in `apps/api/Data/ApplicationDbContext.cs`
- [ ] T011 Add EF migration `apps/api/Data/Migrations/*_AddRegionsAndBookingPlacement.cs` (backfill existing events → `CONFIRMED`)
- [ ] T012 Add `BookingConflictException` and implement `BookingConflictService` in `apps/api/Services/BookingConflictService.cs` until T004 passes
- [ ] T013 [P] Add `RegionDtos` in `apps/api/DTOs/Regions/RegionDtos.cs` and `CalendarDtos` in `apps/api/DTOs/Calendar/CalendarDtos.cs`
- [ ] T014 Extend `CreateEventRequest` / `UpdateEventRequest` / `EventResponse` with booking fields in `apps/api/DTOs/Ledger/LedgerDtos.cs`
- [ ] T015 Register `BookingConflictService` (and placeholder region/calendar services) in `apps/api/Program.cs`
- [ ] T016 Regenerate OpenAPI types into `apps/web/src/types/generated-api.ts` after DTO changes
- [ ] T017 Implement `apps/web/src/lib/bookingCalendar.ts` per data-model until T005 passes

**Checkpoint**: Migration applies; conflict service green; `bookingCalendar.ts` green — user story work can begin

---

## Phase 3: User Story 1 — Open Booking Calendar from global navigation (Priority: P1) 🎯 MVP

**Goal**: Booking Calendar nav item opens `/booking` and highlights correctly; placeholder retired.

**Independent Test**: Sign in with financial view permission → click Booking Calendar → lands on `/booking` with nav active; no "Coming soon" (spec US1).

### Tests for User Story 1 (REQUIRED) ⚠️

- [ ] T018 [P] [US1] Write failing tests for `navigateToBooking` and `/booking` path in `apps/web/tests/lib/appRoute.test.ts` (extend if file exists)
- [ ] T019 [P] [US1] Write failing RTL test for enabled booking nav item in `apps/web/tests/lib/globalNav.test.ts`
- [ ] T020 [P] [US1] Write failing smoke test for `/booking` route render in `apps/web/tests/pages/BookingCalendarPage.test.tsx`

### Implementation for User Story 1

- [ ] T021 [P] [US1] Add `/booking` to `AppPath`, `navigateToBooking`, and URL helpers in `apps/web/src/lib/appRoute.ts`
- [ ] T022 [US1] Enable Booking Calendar item in `apps/web/src/lib/globalNav.ts` (`disabled: false`, `matchPaths: ['/booking']`, `navigate: navigateToBooking`)
- [ ] T023 [US1] Create minimal `apps/web/src/pages/BookingCalendarPage.tsx` shell with `data-testid="booking-calendar-page"`
- [ ] T024 [US1] Register route in `apps/web/src/App.tsx` inside authenticated shell
- [ ] T025 [US1] Run T018–T020 until green

**Checkpoint**: MVP navigation — operators can reach live booking calendar route

---

## Phase 4: User Story 2 — Organize venues under regions (Priority: P1)

**Goal**: CRUD regions; venues require region when org has regions; unassigned grouping supported.

**Independent Test**: Create region, assign venue, see region in API list; delete blocked when venues assigned (spec US2).

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T026 [P] [US2] Write failing xUnit integration tests for regions CRUD and tenant isolation in `apps/api.Tests/Services/RegionServiceTests.cs`
- [ ] T027 [P] [US2] Write failing xUnit tests for venue region validation in `apps/api.Tests/Services/VenueServiceRegionTests.cs`
- [ ] T028 [P] [US2] Write failing RTL tests for `RegionManagementPanel` in `apps/web/tests/booking/RegionManagementPanel.test.tsx`
- [ ] T029 [P] [US2] Write failing tests for region dropdown on venue forms in `apps/web/tests/components/venue/VenueRegionField.test.tsx`

### Implementation for User Story 2

- [ ] T030 [US2] Implement `RegionService` in `apps/api/Services/RegionService.cs` per `contracts/regions-api.md`
- [ ] T031 [US2] Implement `RegionsController` in `apps/api/Controllers/RegionsController.cs`
- [ ] T032 [US2] Extend `VenueService` region validation in `apps/api/Services/VenueService.cs` and update `apps/api/DTOs/Venues/VenueDtos.cs`
- [ ] T033 [P] [US2] Add React Query hooks in `apps/web/src/api/regions.ts`
- [ ] T034 [US2] Implement `RegionManagementPanel` in `apps/web/src/components/booking/RegionManagementPanel.tsx`
- [ ] T035 [US2] Add required region dropdown to `apps/web/src/pages/CreateVenuePage.tsx` and `apps/web/src/components/venue/VenueEditModal.tsx`
- [ ] T036 [US2] Wire "Manage regions" entry on `BookingCalendarPage` in `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T037 [US2] Run T026–T029 until green

**Checkpoint**: Region hierarchy operational; venues mappable to regions

---

## Phase 5: User Story 3 — Global, regional, and single-venue views (Priority: P1)

**Goal**: Month-navigable calendar with Global/Regional/Venue filters; default Global + current month; client-side filter without reload.

**Independent Test**: Seed multi-region data; switch views and month without full page reload (spec US3, SC-002).

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T038 [P] [US3] Write failing xUnit tests for `CalendarService` tenant scoping and date range in `apps/api.Tests/Services/CalendarServiceTests.cs`
- [ ] T039 [P] [US3] Write failing tests for `useCalendarPlacements` in `apps/web/tests/api/calendar.test.ts`
- [ ] T040 [P] [US3] Write failing RTL tests for view mode and month controls in `apps/web/tests/booking/BookingCalendarControls.test.tsx`

### Implementation for User Story 3

- [ ] T041 [US3] Implement `CalendarService` with `.Include()` + `.AsNoTracking()` in `apps/api/Services/CalendarService.cs`
- [ ] T042 [US3] Implement `CalendarController` GET `/api/calendar/placements` in `apps/api/Controllers/CalendarController.cs`
- [ ] T043 [P] [US3] Add `useCalendarPlacements` hook in `apps/web/src/api/calendar.ts`
- [ ] T044 [US3] Implement `BookingCalendarControls` in `apps/web/src/components/booking/BookingCalendarControls.tsx` (view mode, filters, month nav, default Global)
- [ ] T045 [US3] Implement `BookingCalendarMatrix` skeleton in `apps/web/src/components/booking/BookingCalendarMatrix.tsx` with region column grouping
- [ ] T046 [US3] Wire controls, data fetch, and client filter state in `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T047 [US3] Run T038–T040 until green

**Checkpoint**: Multi-venue matrix renders with correct view filters and month navigation

---

## Phase 6: User Story 4 — Visual distinction for holds, confirmed, cancelled (Priority: P1)

**Goal**: Distinct chip styles; cancelled hidden by default; dashboard badge shows real status.

**Independent Test**: Seed all four statuses; verify styles and toggle; dashboard cards match API status (spec US4, FR-025).

### Tests for User Story 4 (REQUIRED) ⚠️

- [ ] T048 [P] [US4] Write failing RTL tests for placement status CSS classes in `apps/web/tests/booking/BookingCalendarMatrix.test.tsx`
- [ ] T049 [P] [US4] Write failing tests for cancelled toggle visibility in `apps/web/tests/booking/BookingCalendarControls.test.tsx`
- [ ] T050 [P] [US4] Write failing tests for real booking badge labels in `apps/web/tests/lib/eventCardLabels.test.ts`

### Implementation for User Story 4

- [ ] T051 [US4] Add booking status modifiers (`.booking-placement--hold`, `--confirmed`, `--cancelled`) in `apps/web/src/index.css`
- [ ] T052 [US4] Apply status classes to matrix chips in `apps/web/src/components/booking/BookingCalendarMatrix.tsx`
- [ ] T053 [US4] Implement "Show cancelled" toggle filtering in `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T054 [US4] Extend dashboard `EventCardDto` mapping in `apps/api/Services/DashboardService.cs` with `bookingPlacementStatus`
- [ ] T055 [US4] Replace hash preview with real status in `apps/web/src/lib/eventCardLabels.ts` and `apps/web/src/components/dashboard/EventCard.tsx`
- [ ] T056 [US4] Run T048–T050 until green

**Checkpoint**: Operators can distinguish statuses visually; dashboard badge live

---

## Phase 7: User Story 5 — Create confirmed booking from calendar (Priority: P1)

**Goal**: Header and quick-add create Confirmed placements with conflict rejection.

**Independent Test**: Create Event modal → Confirmed chip on grid → second Confirmed same date fails (spec US5).

### Tests for User Story 5 (REQUIRED) ⚠️

- [ ] T057 [P] [US5] Write failing xUnit tests for confirmed create via `EventService` in `apps/api.Tests/Services/EventServiceBookingTests.cs`
- [ ] T058 [P] [US5] Write failing RTL tests for `CreateBookingEventModal` in `apps/web/tests/booking/CreateBookingEventModal.test.tsx`

### Implementation for User Story 5

- [ ] T059 [US5] Extend `EventService.CreateEventAsync` for `CONFIRMED` + schedule fields + conflict check in `apps/api/Services/EventService.cs`
- [ ] T060 [US5] Extend `useCreateEvent` mutation payload in `apps/web/src/api/events.ts`
- [ ] T061 [US5] Implement `CreateBookingEventModal` in `apps/web/src/components/booking/CreateBookingEventModal.tsx`
- [ ] T062 [US5] Wire header create button and cell quick-add prefills in `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T063 [US5] Invalidate calendar queries on successful create in `apps/web/src/api/events.ts`
- [ ] T064 [US5] Run T057–T058 until green

**Checkpoint**: Confirmed bookings creatable from calendar with server-side conflict enforcement

---

## Phase 8: User Story 6 — Create and tier holds (Priority: P1)

**Goal**: Hold 1/Hold 2 creation with auto-tier; workspace blocked for holds.

**Independent Test**: Hold 1 → Hold 2 → third rejected; workspace navigation blocked (spec US6).

### Tests for User Story 6 (REQUIRED) ⚠️

- [ ] T065 [P] [US6] Write failing xUnit tests for hold create and auto-tier in `apps/api.Tests/Services/EventServiceBookingTests.cs`
- [ ] T066 [P] [US6] Write failing RTL tests for `CreateHoldModal` in `apps/web/tests/booking/CreateHoldModal.test.tsx`
- [ ] T067 [P] [US6] Write failing test for workspace guard on holds in `apps/web/tests/pages/EventWorkspacePage.test.tsx`

### Implementation for User Story 6

- [ ] T068 [US6] Extend `EventService` for `HOLD_1`/`HOLD_2` create with `BookingConflictService` auto-tier in `apps/api/Services/EventService.cs`
- [ ] T069 [US6] Implement `CreateHoldModal` in `apps/web/src/components/booking/CreateHoldModal.tsx`
- [ ] T070 [US6] Wire "+ Create Hold" in `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T071 [US6] Block workspace navigation for holds in `apps/web/src/pages/EventWorkspacePage.tsx` (redirect to `/booking` with message)
- [ ] T072 [US6] Hide workspace links for holds in `apps/web/src/components/booking/BookingEventDrawer.tsx` (stub drawer if not yet built)
- [ ] T073 [US6] Run T065–T067 until green

**Checkpoint**: Hold workflow complete with tier rules and workspace block

---

## Phase 9: User Story 7 — Daily agenda drill-down (Priority: P2)

**Goal**: Click date opens chronological agenda across filtered venues.

**Independent Test**: Click busy date → agenda lists venue, time, act, status sorted correctly (spec US7, SC-007).

### Tests for User Story 7 (REQUIRED) ⚠️

- [ ] T074 [P] [US7] Write failing RTL tests for `BookingDailyAgendaDrawer` in `apps/web/tests/booking/BookingDailyAgendaDrawer.test.tsx`

### Implementation for User Story 7

- [ ] T075 [US7] Implement `BookingDailyAgendaDrawer` in `apps/web/src/components/booking/BookingDailyAgendaDrawer.tsx` (mirror a11y from `apps/web/src/components/dashboard/UnassignedTransactionsDrawer.tsx`)
- [ ] T076 [US7] Wire date cell click to open agenda with `sortAgendaPlacements` in `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T077 [US7] Run T074 until green

**Checkpoint**: High-density dates drill down to full daily list

---

## Phase 10: User Story 8 — Event control panel (detail, edit, delete) (Priority: P2)

**Goal**: Drawer for detail/edit; hold hard-delete; confirmed soft-cancel with accounting warning.

**Independent Test**: Edit date with conflict check; release hold; cancel confirmed with warning (spec US8).

### Tests for User Story 8 (REQUIRED) ⚠️

- [ ] T078 [P] [US8] Write failing xUnit tests for update, cancel, and hold delete in `apps/api.Tests/Services/EventServiceBookingTests.cs`
- [ ] T079 [P] [US8] Write failing RTL tests for `BookingEventDrawer` modes in `apps/web/tests/booking/BookingEventDrawer.test.tsx`

### Implementation for User Story 8

- [ ] T080 [US8] Extend `EventService.UpdateEventMetadataAsync` and add cancel/hold-delete paths in `apps/api/Services/EventService.cs` with `FrozenEventMutationAuditor` guards
- [ ] T081 [US8] Implement `BookingEventDrawer` in `apps/web/src/components/booking/BookingEventDrawer.tsx` (detail, edit, delete/release)
- [ ] T082 [US8] Wire chip and agenda row click to drawer in `apps/web/src/components/booking/BookingCalendarMatrix.tsx` and `BookingDailyAgendaDrawer.tsx`
- [ ] T083 [US8] Surface 409 conflict errors inline in drawer forms
- [ ] T084 [US8] Run T078–T079 until green

**Checkpoint**: Full placement lifecycle manageable from calendar drawer

---

## Phase 11: User Story 9 — Mobile layout (Priority: P2)

**Goal**: Below 768px, matrix hidden; vertical date-grouped stream shown.

**Independent Test**: 375px viewport — mobile stream visible, no horizontal matrix scroll (spec US9, SC-008).

### Tests for User Story 9 (REQUIRED) ⚠️

- [ ] T085 [P] [US9] Write failing RTL tests for mobile breakpoint behavior in `apps/web/tests/booking/BookingCalendarMobileStream.test.tsx`

### Implementation for User Story 9

- [ ] T086 [US9] Implement `BookingCalendarMobileStream` in `apps/web/src/components/booking/BookingCalendarMobileStream.tsx`
- [ ] T087 [US9] Add responsive CSS breakpoint rules in `apps/web/src/index.css` (hide matrix, show stream `<768px`)
- [ ] T088 [US9] Wire mobile stream into `apps/web/src/pages/BookingCalendarPage.tsx`
- [ ] T089 [US9] Run T085 until green

**Checkpoint**: Calendar usable on mobile without matrix scroll

---

## Phase 12: User Story 10 — Promote hold to confirmed (Priority: P2)

**Goal**: Promote Hold 1/2 to Confirmed; sibling holds remain; workspace unlocked after promotion.

**Independent Test**: Promote Hold 1 with Hold 2 present → both Confirmed and Hold 2 visible; workspace opens (spec US10).

### Tests for User Story 10 (REQUIRED) ⚠️

- [ ] T090 [P] [US10] Write failing xUnit tests for promotion with sibling holds in `apps/api.Tests/Services/EventServiceBookingTests.cs`
- [ ] T091 [P] [US10] Write failing RTL tests for Promote action in `apps/web/tests/booking/BookingEventDrawer.test.tsx`

### Implementation for User Story 10

- [ ] T092 [US10] Add promotion transition (`HOLD_*` → `CONFIRMED`) in `apps/api/Services/EventService.cs` via `BookingConflictService`
- [ ] T093 [US10] Add Promote action to `BookingEventDrawer` in `apps/web/src/components/booking/BookingEventDrawer.tsx`
- [ ] T094 [US10] Enable workspace link after promotion when `workspaceAllowed` is true
- [ ] T095 [US10] Run T090–T091 until green

**Checkpoint**: Hold-to-confirmed promotion complete per clarified rules

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: E2E validation, coverage gate, matrix overflow polish, quickstart sign-off

- [ ] T096 [P] Add Playwright spec `tests/e2e/specs/booking/booking-calendar-happy-path.spec.ts` (nav → create hold → promote → workspace)
- [ ] T097 [P] Add Playwright spec `tests/e2e/specs/booking/booking-calendar-filters.spec.ts` (region filter, cancelled toggle)
- [ ] T098 [P] Implement `+N more` cell overflow affordance in `apps/web/src/components/booking/BookingCalendarMatrix.tsx` per UI contract
- [ ] T099 [P] Add Font Awesome icons per `contracts/booking-calendar-ui.md` in nav and calendar controls
- [ ] T100 Verify ≥80.0% line/branch coverage on new backend code via `cd apps/api && dotnet test /p:CollectCoverage=true`; missing or unparseable cobertura FAIL
- [ ] T101 Verify ≥80.0% line/branch coverage on new frontend code via `cd apps/web && npm run test:coverage -- tests/booking/ tests/lib/bookingCalendar.test.ts`; missing or unparseable lcov FAIL
- [ ] T102 Run manual scenarios A–K in `specs/073-unified-booking-calendar/quickstart.md` and document any gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP entry (nav + empty page)
- **US2 (Phase 4)**: Depends on Foundational — can parallel with US1 after T017
- **US3 (Phase 5)**: Depends on Foundational — benefits from US1 route shell
- **US4 (Phase 6)**: Depends on US3 matrix skeleton
- **US5–US6 (Phases 7–8)**: Depend on Foundational conflict service; benefit from US3 data wiring
- **US7 (Phase 9)**: Depends on US3 matrix + placement data
- **US8 (Phase 10)**: Depends on US5–US6 event write paths
- **US9 (Phase 11)**: Depends on US3 page shell; can parallel with US7–US8
- **US10 (Phase 12)**: Depends on US6 holds + US8 drawer
- **Polish (Phase 13)**: Depends on all desired user stories

### User Story Dependencies

| Story | Depends on | Independent test focus |
|-------|------------|------------------------|
| US1 | Foundational | Nav → `/booking` |
| US2 | Foundational | Region CRUD + venue assign |
| US3 | US1 shell (minimal) | View modes + month nav |
| US4 | US3 | Status styling + badge |
| US5 | US3, conflict service | Create Confirmed |
| US6 | US3, conflict service | Create holds + workspace block |
| US7 | US3 | Daily agenda drawer |
| US8 | US5–US6 | Edit/cancel/delete drawer |
| US9 | US3 | Mobile stream |
| US10 | US6, US8 | Promote hold |

### Parallel Opportunities

- **Phase 2**: T004 ∥ T005; T006 ∥ T007; T013 after models
- **After Phase 2**: US1 + US2 backend can proceed in parallel (different files)
- **US3 backend** (T038–T042) ∥ **US1 frontend** (T021–T024) if staffed separately
- **US4–US6**: Test tasks marked [P] within each phase
- **US9** can run parallel to **US7–US8** once US3 page exists
- **Polish**: T096 ∥ T097 ∥ T098 ∥ T099

### Parallel Example: User Story 2

```bash
# Launch US2 tests together:
T026: apps/api.Tests/Services/RegionServiceTests.cs
T027: apps/api.Tests/Services/VenueServiceRegionTests.cs
T028: apps/web/tests/booking/RegionManagementPanel.test.tsx
T029: apps/web/tests/components/venue/VenueRegionField.test.tsx

# Then implementation:
T030–T032: API layer (sequential)
T033 ∥ T034: hooks ∥ panel component
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1–2 (Setup + Foundational)
2. Complete Phase 3 (US1 — nav + empty `/booking` page)
3. **STOP and VALIDATE**: Nav works; placeholder retired

### Incremental delivery (recommended)

1. Foundation → US1 (nav) → US2 (regions) → US3 (matrix views)
2. US4 (visual) + US5 (create event) + US6 (holds) — core scheduling
3. US7–US8 (agenda + drawer) → US10 (promote) → US9 (mobile)
4. Polish + E2E + coverage gate

### Parallel team strategy

1. Team completes Phase 2 together
2. Developer A: US1 + US3 frontend
3. Developer B: US2 + Calendar API
4. Developer C: US5–US6 + conflict integration tests
5. Converge on US8 drawer + Polish

---

## Notes

- Regenerate `generated-api.ts` after every DTO change (T016 and as needed)
- Never hand-edit types in `apps/web/src/types/generated-api.ts` (Constitution VI)
- Hold workspace block (T071) is required before promoting US6 complete
- Cancelled placements excluded from conflicts per clarified spec — verify in T004/T057
- Promotion must not auto-release sibling holds — verify in T090
