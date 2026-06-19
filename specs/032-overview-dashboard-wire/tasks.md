---
description: "Task list for Server-Backed Dashboard Overview and Pin Persistence (SPLR-71)"
---

# Tasks: Server-Backed Dashboard Overview and Pin Persistence

**Input**: Design documents from `/specs/032-overview-dashboard-wire/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-hooks-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds Vitest + RTL tests (write failing tests first, then implement until green). Final Polish phase enforces ≥80.0% line/branch coverage on **frontend** touched files via `npm run test:coverage` (Vitest → lcov). Backend unchanged — run `dotnet test` for regression only; no new backend coverage required.

**Organization**: Tasks grouped by user story (US1–US5). Frontend slice through `apps/web/src/api/`, `apps/web/src/pages/`, `apps/web/src/components/dashboard/`, and `apps/web/tests/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- API hooks: `apps/web/src/api/dashboard.ts`
- Page: `apps/web/src/pages/DashboardOverviewPage.tsx`
- Event card: `apps/web/src/components/dashboard/EventCard.tsx`
- Zone components: `apps/web/src/components/dashboard/DashboardZoneEvents.tsx`, `DashboardZoneSections.tsx`
- Summary helper: `apps/web/src/lib/eventCardSummary.ts` (new)
- Types: `apps/web/src/types/generated-api.ts` (import only — no manual edits)
- Hook tests: `apps/web/tests/api/dashboard.test.tsx`
- Page tests: `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- EventCard tests: `apps/web/tests/components/dashboard/EventCard.test.tsx`
- Mock harness: `apps/web/tests/utils/mockWorkspaceFetch.ts`
- Contract matrix: `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, upstream APIs, and contract matrix before implementation.

- [x] T001 Verify branch `032-overview-dashboard-wire` and design docs in `specs/032-overview-dashboard-wire/` per plan.md
- [x] T002 [P] Review UI/hooks contract matrix in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md` (rows F1–F12)
- [x] T003 [P] Confirm upstream prerequisites merged: `DashboardResponse` / `EventCardDto` in `apps/web/src/types/generated-api.ts`; `GET /api/venues/{venueId}/dashboard` in `apps/api/Controllers/DashboardController.cs`; pin routes in `apps/api/Controllers/EventsController.cs` (specs 031 + 030)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared hooks scaffold, mock harness, and zone typing. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until dashboard query module and test mocks exist.

- [x] T004 Create `dashboardQueryKey(venueId)` and `useDashboard(venueId)` in `apps/web/src/api/dashboard.ts` — `apiFetch<DashboardResponse>`, `staleTime: 30_000`, `enabled: Boolean(venueId)` per `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`
- [x] T005 [P] Extend `mockWorkspaceFetch` in `apps/web/tests/utils/mockWorkspaceFetch.ts` with `dashboardByVenue` fixture map and handlers for `GET /venues/:id/dashboard` plus `PUT`/`DELETE .../pin` route tracking
- [x] T006 [P] Widen zone component props to `EventCardDto[]` in `apps/web/src/components/dashboard/DashboardZoneEvents.tsx` and `apps/web/src/components/dashboard/DashboardZoneSections.tsx` — remove `isEventPinned` callback from prop types (use `event.isPinned` when wired in later phases)

**Checkpoint**: `useDashboard` compiles; mocks serve dashboard JSON; zone components accept `EventCardDto`

---

## Phase 3: User Story 1 — Overview Loads from Authoritative Server Data (Priority: P1) 🎯 MVP

**Goal**: Dashboard overview renders four server partition arrays from `useDashboard` / `useAllVenuesDashboard` instead of `useEvents` + `partitionOverviewZones`.

**Independent Test**: `cd apps/web && npm run test -- tests/pages/DashboardOverviewPage.test.tsx` — server partition and tonight-hidden tests pass (quickstart Scenarios A–B).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Add failing test `renders zones from dashboard fixture partitions` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F1; mock `dashboardByVenue` not `eventsByVenue`)
- [x] T008 [P] [US1] Add failing test `hides tonight hero when tonightEvents empty` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F2)
- [x] T009 [P] [US1] Add failing test `shows no-events empty state when all partitions empty` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T010 [P] [US1] Add failing hook test `useDashboard uses staleTime 30_000 and correct query key` in `apps/web/tests/api/dashboard.test.ts` (contract F10)

### Implementation for User Story 1

- [x] T011 [US1] Implement `useAllVenuesDashboard(venueIds)` merge helper in `apps/web/src/api/dashboard.ts` per `specs/032-overview-dashboard-wire/data-model.md` (concat + dedupe by `eventId`)
- [x] T012 [US1] Refactor `DashboardOverviewPage` in `apps/web/src/pages/DashboardOverviewPage.tsx` — replace `useEvents` / `useAllVenuesEvents` and `partitionOverviewZones` with dashboard hooks; map `pinnedEvents`, `tonightEvents`, `upcomingEvents`, `recentEvents` to zone sections
- [x] T013 [US1] Update empty-state logic in `apps/web/src/pages/DashboardOverviewPage.tsx` — detect no events when all four partition arrays are empty
- [x] T014 [US1] Update error/retry in `apps/web/src/pages/DashboardOverviewPage.tsx` to refetch dashboard query instead of events query
- [x] T015 [US1] Run US1 tests until green: `cd apps/web && npm run test -- tests/pages/DashboardOverviewPage.test.tsx tests/api/dashboard.test.ts`
- [x] T016 [US1] Mark rows F1, F2, F10 complete in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`

**Checkpoint**: MVP — overview loads from server dashboard aggregate; no client partition on page

---

## Phase 4: User Story 2 — Pin Preferences Persist Across Sessions and Devices (Priority: P1)

**Goal**: Pin/unpin actions call server `PUT`/`DELETE .../pin`; overview uses `event.isPinned` from dashboard response; `pinnedEventStorage` removed from overview.

**Independent Test**: Pin + simulated refetch in `DashboardOverviewPage.test.tsx` shows pinned zone from API fixture, not localStorage (quickstart Scenario C).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T017 [P] [US2] Add failing test `pin toggle calls PUT pin endpoint` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F3)
- [x] T018 [P] [US2] Add failing test `pinned state survives dashboard refetch without localStorage` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F3, F9)
- [x] T019 [P] [US2] Add failing test `unpin removes event from pinned zone after refetch` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`
- [x] T020 [P] [US2] Add failing hook test `usePinEvent invalidates dashboard query on success` in `apps/web/tests/api/dashboard.test.ts`

### Implementation for User Story 2

- [x] T021 [US2] Implement `usePinEvent(venueId)` and `useUnpinEvent(venueId)` in `apps/web/src/api/dashboard.ts` — `PUT`/`DELETE` to `/venues/${venueId}/events/${eventId}/pin`; `onSettled` → `invalidateQueries(dashboardQueryKey(venueId))`
- [x] T022 [US2] Wire `handlePinToggle(venueId, eventId, isPinned)` in `apps/web/src/pages/DashboardOverviewPage.tsx` to pin/unpin mutations; pass `event.isPinned` to zone sections (remove `isEventPinned` callback usage)
- [x] T023 [US2] Update zone components in `apps/web/src/components/dashboard/DashboardZoneEvents.tsx` and `DashboardZoneSections.tsx` to use `event.isPinned` and new `onPinToggle(venueId, eventId, isPinned)` signature
- [x] T024 [US2] Remove imports of `isEventPinned`, `toggleEventPinned`, and `pinnedRevision` state from `apps/web/src/pages/DashboardOverviewPage.tsx`
- [x] T025 [US2] Run US2 tests until green: `cd apps/web && npm run test -- tests/pages/DashboardOverviewPage.test.tsx tests/api/dashboard.test.ts`
- [x] T026 [US2] Mark rows F3, F9 complete in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`

**Checkpoint**: Pins persist via server; overview no longer uses `pinnedEventStorage`

---

## Phase 5: User Story 3 — Event Cards Reflect Server-Provided Summaries (Priority: P2)

**Goal**: `EventCard` displays `hasVarianceConcern`, `unmappedCount`, and bottleneck chips from `EventCardDto` with client lifecycle fallback for quick links.

**Independent Test**: `EventCard.test.tsx` shows variance badge and unmapped chip from DTO fields without `lineItems` (quickstart Scenario F).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T027 [P] [US3] Add failing test `shows variance badge when hasVarianceConcern true` in `apps/web/tests/components/dashboard/EventCard.test.tsx` (contract F7)
- [x] T028 [P] [US3] Add failing test `shows unmapped bottleneck when unmappedCount > 0` in `apps/web/tests/components/dashboard/EventCard.test.tsx`
- [x] T029 [P] [US3] Add failing test `renders phase quick links via deriveLifecyclePhase fallback` in `apps/web/tests/components/dashboard/EventCard.test.tsx` (contract F8)

### Implementation for User Story 3

- [x] T030 [P] [US3] Create `deriveBottleneckAlertsFromSummary(dto: EventCardDto)` in `apps/web/src/lib/eventCardSummary.ts` per `specs/032-overview-dashboard-wire/research.md` §6
- [x] T031 [US3] Update `EventCard` in `apps/web/src/components/dashboard/EventCard.tsx` — accept `EventCardDto`; variance from `hasVarianceConcern`; merge summary + `deriveBottleneckAlerts` fallback; keep `lineItems` path for workspace compatibility
- [x] T032 [US3] Run US3 tests until green: `cd apps/web && npm run test -- tests/components/dashboard/EventCard.test.tsx`
- [x] T033 [US3] Mark rows F7, F8 complete in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`

**Checkpoint**: Overview cards show server summary alerts without per-event ledger fetches

---

## Phase 6: User Story 4 — Venue Switch Refreshes the Overview (Priority: P2)

**Goal**: Changing active venue triggers a new dashboard fetch; overview never shows mixed-venue data.

**Independent Test**: Venue switch test in `DashboardOverviewPage.test.tsx` loads different `dashboardByVenue` fixtures (quickstart Scenario E).

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T034 [P] [US4] Add failing test `venue switch loads new dashboard fixture` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F6)
- [x] T035 [P] [US4] Add failing test `pins from venue A not shown after switching to venue B` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

### Implementation for User Story 4

- [x] T036 [US4] Verify `useDashboard` / `useAllVenuesDashboard` in `apps/web/src/api/dashboard.ts` re-fetch when `activeVenueId` or `venueIds` change (adjust `queryKey` / `enabled` if tests reveal stale cross-venue data)
- [x] T037 [US4] Update `handleCardActivate` in `apps/web/src/pages/DashboardOverviewPage.tsx` to always use `event.venueId` from card DTO (required for all-venues mode)
- [x] T038 [US4] Run US4 tests until green: `cd apps/web && npm run test -- tests/pages/DashboardOverviewPage.test.tsx`
- [x] T039 [US4] Mark row F6 complete in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`

**Checkpoint**: Venue context switch replaces all zone data from server

---

## Phase 7: User Story 5 — Responsive Pin Interaction During Overview Use (Priority: P3)

**Goal**: Optimistic pin UI updates immediately; failed mutations roll back with user-visible error feedback.

**Independent Test**: Optimistic and rollback tests in `dashboard.test.ts` and `DashboardOverviewPage.test.tsx` (quickstart Scenario D).

### Tests for User Story 5 (REQUIRED) ⚠️

- [x] T040 [P] [US5] Add failing test `pin toggle updates UI before network completes` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F4)
- [x] T041 [P] [US5] Add failing test `failed pin reverts optimistic state and shows error` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` (contract F5)
- [x] T042 [P] [US5] Add failing hook test `applyPinOptimisticUpdate toggles cache and rolls back on error` in `apps/web/tests/api/dashboard.test.ts`

### Implementation for User Story 5

- [x] T043 [US5] Add `applyPinOptimisticUpdate(queryClient, venueId, eventId, pinned)` helper in `apps/web/src/api/dashboard.ts` per `specs/032-overview-dashboard-wire/data-model.md`
- [x] T044 [US5] Wire `onMutate` / `onError` optimistic cache updates in `usePinEvent` and `useUnpinEvent` in `apps/web/src/api/dashboard.ts`
- [x] T045 [US5] Add user-visible mutation error feedback in `apps/web/src/pages/DashboardOverviewPage.tsx` (toast or inline alert consistent with existing dashboard error patterns)
- [x] T046 [US5] Run US5 tests until green: `cd apps/web && npm run test -- tests/api/dashboard.test.ts tests/pages/DashboardOverviewPage.test.tsx`
- [x] T047 [US5] Mark rows F4, F5 complete in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`

**Checkpoint**: Pin toggles feel instant with safe rollback on failure

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression suite, contract completion, cleanup.

- [x] T048 [P] Remove any remaining overview references to `partitionOverviewZones` and `pinnedEventStorage` in `apps/web/src/pages/DashboardOverviewPage.tsx`; confirm `apps/web/src/lib/partitionOverviewZones.ts` retained for its unit tests only
- [x] T049 [P] Migrate or remove obsolete pin/localStorage assertions in `apps/web/tests/pages/DashboardOverviewPage.test.tsx` that conflict with server pin behavior
- [x] T050 Run full frontend test suite: `cd apps/web && npm run test`
- [x] T051 Run backend regression: `cd apps/api.tests && dotnet test` (no new backend code expected)
- [x] T052 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage` (Vitest → lcov); missing or unparseable reports FAIL (Constitution III)
- [x] T053 Mark row F11 complete in `specs/032-overview-dashboard-wire/contracts/dashboard-hooks-ui.md`
- [x] T054 Run quickstart.md manual validation scenarios A–H in `specs/032-overview-dashboard-wire/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — **MVP**
- **US2 (Phase 4)**: Depends on US1 (page uses dashboard hooks before pin wiring)
- **US3 (Phase 5)**: Depends on Foundational; can parallel with US2 after US1 (different files)
- **US4 (Phase 6)**: Depends on US1 (dashboard fetch by venue)
- **US5 (Phase 7)**: Depends on US2 (pin mutations must exist before optimistic layer)
- **Polish (Phase 8)**: Depends on desired user stories complete

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Foundational | Server zones render from dashboard fixture |
| US2 | P1 | US1 | Pin persists after refetch; no localStorage |
| US3 | P2 | Foundational | EventCard summary fields from DTO |
| US4 | P2 | US1 | Venue switch loads new dashboard data |
| US5 | P3 | US2 | Optimistic pin + rollback on failure |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 (after T004 starts or in parallel if T004 is quick)
- **US1 tests**: T007 ∥ T008 ∥ T009 ∥ T010
- **US2 tests**: T017 ∥ T018 ∥ T019 ∥ T020
- **US3**: T027 ∥ T028 ∥ T029; T030 ∥ (blocked until tests written)
- **US4 tests**: T034 ∥ T035
- **US5 tests**: T040 ∥ T041 ∥ T042
- **After US1**: US3 (EventCard) can proceed in parallel with US2 (pin wiring) by different developers

### Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail first):
npm run test -- tests/pages/DashboardOverviewPage.test.tsx -t "renders zones from dashboard"
npm run test -- tests/pages/DashboardOverviewPage.test.tsx -t "hides tonight hero"
npm run test -- tests/api/dashboard.test.ts -t "staleTime"
```

### Parallel Example: After US1 Complete

```bash
# Developer A — US2 pin persistence:
# T017–T026 in apps/web/src/api/dashboard.ts + DashboardOverviewPage.tsx

# Developer B — US3 EventCard summaries:
# T027–T033 in apps/web/src/components/dashboard/EventCard.tsx + eventCardSummary.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Overview renders server partitions; no client `partitionOverviewZones`
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → hooks and mocks ready
2. US1 → server-backed zones (MVP)
3. US2 → persistent server pins
4. US3 → rich event card summaries
5. US4 → venue switch correctness
6. US5 → optimistic pin UX
7. Polish → coverage + quickstart

### Suggested MVP Scope

**User Story 1 only** (Phases 1–3): Delivers the core Phase 2 value — overview fed by `GET /dashboard` with correct zone layout. Pin and summary enhancements follow without rework to the data layer.

---

## Notes

- Do **not** manually edit `apps/web/src/types/generated-api.ts` — import `DashboardResponse` and `EventCardDto` only (Constitution VI)
- Do **not** delete `apps/web/src/lib/partitionOverviewZones.ts` — keep unit tests as date-rule reference
- Action Center, Financial Health, and Unassigned Transactions banner remain out of scope (FR-014 / SPLR-74–76)
- `[P]` tasks touch different files; avoid parallel edits to `DashboardOverviewPage.tsx` across US1/US2/US4/US5 — sequence those phases
