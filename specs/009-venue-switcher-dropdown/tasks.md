# Tasks: Dashboard Tenant/Venue Switching Dropdown (Respect Venue Scope)

**Input**: Design documents from `/specs/009-venue-switcher-dropdown/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write tests first, ensure they fail before implementation). Final Polish phase includes the ≥80% frontend coverage gate. **No backend changes** — backend coverage gate is N/A for this feature slice.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/web/src/`, `apps/web/tests/`
- **E2E**: `tests/e2e/specs/venue/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold directories and styling hooks for the venue workspace layer.

- [x] T001 Create venue workspace directories `apps/web/src/venue/` and `apps/web/src/components/venue/`
- [x] T002 [P] Add venue switcher CSS scaffold (header placement, dropdown, active indicator, single-venue state) in `apps/web/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Session-scoped active-venue storage and `apiFetch` header injection. **No user story work can begin until this phase is complete.**

**⚠️ CRITICAL**: `GET /api/venues` collapses to the active venue when `X-Active-Venue-Id` is sent — the venues-list call must opt out via `skipVenueContext`.

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] Write failing tests for `activeVenueStorage` (get/set/clear, malformed value → null, sessionStorage not localStorage) per contracts C1.1–C1.5 in `apps/web/tests/venue/activeVenueStorage.test.ts`
- [x] T004 [P] Write failing tests for `apiFetch` venue-header injection (attach header, skipVenueContext omit, no header when absent, 401 retry re-attaches, caller headers preserved) per contracts C2.1–C2.5 in `apps/web/tests/api/client.venueHeader.test.ts`
- [x] T005 [P] Extend failing test in `apps/web/tests/api/venues.test.tsx` asserting `GET /api/venues` omits `X-Active-Venue-Id` via `skipVenueContext` per contracts C3.1–C3.3

### Implementation for Foundational

- [x] T006 Implement `getActiveVenueId`, `setActiveVenueId`, `clearActiveVenueId` in `apps/web/src/venue/activeVenueStorage.ts` (sessionStorage key `activeVenueId`)
- [x] T007 Extend `ApiFetchInit` with `skipVenueContext` and inject `X-Active-Venue-Id` from `activeVenueStorage` in `apps/web/src/api/client.ts` without disturbing existing 401 recovery
- [x] T008 Extend `useVenues()` to pass `skipVenueContext: true` on `GET /api/venues` in `apps/web/src/api/venues.ts`

**Checkpoint**: Transport layer ready — venue list returns full server-scoped set; other requests can carry active-venue header.

---

## Phase 3: User Story 1 — Switch the active venue from the dashboard (Priority: P1) 🎯 MVP

**Goal**: Authenticated users with multiple venues can open a header dropdown, select a different venue, and see the ledger reload scoped to the new venue with `X-Active-Venue-Id` sent on downstream requests.

**Independent Test**: Sign in as a user with two or more venues, open the venue selector, choose a different venue, and confirm the active workspace reflects the selected venue and the ledger view reloads with that venue's data.

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T009 [P] [US1] Write failing `VenueProvider` tests (load scoped list, default first venue, `setActiveVenue` updates context + persists, `useActiveVenue` throws outside provider) per contracts C4.1–C4.6, C4.8 in `apps/web/tests/venue/VenueContext.test.tsx`
- [x] T010 [P] [US1] Write failing `VenueSwitcher` tests (lists venues by name, active indicated, selection calls `setActiveVenue`) per contracts C5.1–C5.3 in `apps/web/tests/venue/VenueSwitcher.test.tsx`
- [x] T011 [P] [US1] Extend failing `DashboardHome` tests (renders `VenueSwitcher` in header, ledger `venueId` from active venue, event resets to default on switch, loading/empty/error preserved) per contracts C6.1–C6.5 in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 1

- [x] T012 [US1] Implement `VenueProvider` and `useActiveVenue` hook exposing `{ venues, activeVenueId, activeVenue, isLoading, isError, refetch, setActiveVenue }` with default-first resolution in `apps/web/src/venue/VenueContext.tsx` and `apps/web/src/venue/useActiveVenue.ts`
- [x] T013 [US1] Implement keyboard-accessible `VenueSwitcher` dropdown consuming `useActiveVenue()` in `apps/web/src/components/venue/VenueSwitcher.tsx`
- [x] T014 [US1] Rewire `DashboardHome` to render `VenueSwitcher` in header, drive `EventLedgerPage` `venueId` from `useActiveVenue().activeVenueId`, and reset open event to the new venue's default on switch in `apps/web/src/pages/DashboardHome.tsx`
- [x] T015 [US1] Wrap authenticated dashboard subtree in `<VenueProvider>` when `phase === 'authenticated'` in `apps/web/src/App.tsx` (provider order: QueryClient → Auth → Venue → Dashboard)

**Checkpoint**: User Story 1 is fully functional — users can switch venues and see the ledger update. MVP deliverable.

---

## Phase 4: User Story 2 — Venue list respects the user's venue scope (Priority: P2)

**Goal**: Full-access users see all org venues; scoped users see only assigned venues (server-scoped list rendered verbatim). Out-of-scope activation is rejected and the prior active venue is retained.

**Independent Test**: Sign in as a scoped user and confirm only assigned venues appear; sign in as a full-access user and confirm all organization venues appear; attempt out-of-scope activation and confirm denial.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T016 [P] [US2] Extend `VenueSwitcher.test.tsx` asserting list renders server response verbatim (no client-side filtering) and single-venue state per contracts C5.5–C5.7
- [x] T017 [P] [US2] Extend `VenueContext.test.tsx` asserting empty venue list yields `activeVenueId: null` and `setActiveVenue` rejects ids not in scoped list per contracts C4.8 and FR-008
- [x] T018 [US2] Write failing Playwright E2E spec for full-access sees all venues (E1), scoped user sees only assigned (E2), and out-of-scope venue denied with active venue unchanged (E4) in `tests/e2e/specs/venue/venue-switching.spec.ts`

### Implementation for User Story 2

- [x] T019 [US2] Harden `setActiveVenue` in `apps/web/src/venue/VenueContext.tsx` to only accept ids present in the scoped list and retain prior `activeVenueId` on server 403 responses (FR-008)
- [x] T020 [US2] Implement single-venue and no-venue affordances in `apps/web/src/components/venue/VenueSwitcher.tsx` (active-only display; render nothing when list empty — dashboard empty state handles FR-012)

**Checkpoint**: User Stories 1 and 2 both work independently — scope is enforced server-side and reflected correctly in the UI.

---

## Phase 5: User Story 3 — Selected venue persists across the session (Priority: P3)

**Goal**: Selected venue survives navigation and reload within the same tab/session via `sessionStorage`. First load picks a sensible default; inaccessible remembered selections fall back gracefully.

**Independent Test**: Select a non-default venue, reload the dashboard in the same tab, and confirm the previously selected venue remains active. Reload with a stale remembered id and confirm fallback to default.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T021 [P] [US3] Extend `VenueContext.test.tsx` for remembered-id restore on load, default-first when no remembered id (FR-010), and fallback when remembered id no longer in scoped list (FR-011) per contracts C4.2–C4.4
- [x] T022 [P] [US3] Extend `DashboardHome.test.tsx` asserting reload within session restores active venue and navigation preserves selection (FR-009)

### Implementation for User Story 3

- [x] T023 [US3] Implement full active-venue resolution algorithm (remembered-if-accessible → else first venue → else null) with persist-on-default in `apps/web/src/venue/VenueContext.tsx` per `data-model.md` D5
- [x] T024 [US3] Clear `activeVenueId` from sessionStorage on explicit logout in `apps/web/src/auth/AuthContext.tsx` per contract C7.3

**Checkpoint**: All three user stories independently functional — switching, scoping, and persistence complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, E2E completion, styling, validation, and coverage gate.

- [x] T025 [P] Extend `VenueSwitcher.test.tsx` with keyboard operability and accessible name/current-selection assertions per contract C5.4 and FR-013
- [x] T026 Complete Playwright E2E scenario E3 (selecting a venue updates ledger and requests carry `X-Active-Venue-Id`) in `tests/e2e/specs/venue/venue-switching.spec.ts`
- [x] T027 [P] Finalize venue switcher styling (active indicator, focus ring, mobile header layout) in `apps/web/src/index.css`
- [x] T028 Run manual and automated validation steps from `specs/009-venue-switcher-dropdown/quickstart.md`
- [x] T029 Verify ≥80.0% line/branch coverage for frontend via `npm run test:coverage` in `apps/web/` (Vitest → lcov; missing or unparseable report = FAIL per Constitution III). Backend gate N/A — no backend changes in this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP, no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 core switcher (builds on existing UI)
- **User Story 3 (Phase 5)**: Depends on Foundational + US1 `VenueProvider` (extends resolution logic)
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|-----------|-----------------|
| US1 (P1) | Foundational | Phase 2 checkpoint |
| US2 (P2) | Foundational, US1 switcher shell | Phase 3 checkpoint (or in parallel once T012–T013 land) |
| US3 (P3) | Foundational, US1 VenueProvider | Phase 3 checkpoint |

US2 and US3 are independently testable once US1's provider and switcher exist, but US2/US3 implementation tasks extend files created in US1.

### Within Each User Story

1. Tests written and failing before implementation
2. Storage/transport before context
3. Context before UI components
4. Components before page rewiring
5. Page rewiring before provider wiring (US1)

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001
- **Phase 2**: T003, T004, T005 in parallel; then T006 → T007 → T008 sequentially (shared `client.ts`/`venues.ts`)
- **Phase 3**: T009, T010, T011 in parallel; then T012 → T013 → T014 → T015
- **Phase 4**: T016, T017 in parallel; T018 can start once US1 lands
- **Phase 5**: T021, T022 in parallel; then T023 → T024
- **Phase 6**: T025, T027 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail before implementation):
Task T009: "Write failing VenueProvider tests in apps/web/tests/venue/VenueContext.test.tsx"
Task T010: "Write failing VenueSwitcher tests in apps/web/tests/venue/VenueSwitcher.test.tsx"
Task T011: "Extend failing DashboardHome tests in apps/web/tests/pages/DashboardHome.test.tsx"

# After tests fail, implement in order:
Task T012 → T013 → T014 → T015
```

---

## Parallel Example: Foundational

```bash
# Launch all foundational tests together:
Task T003: "activeVenueStorage tests in apps/web/tests/venue/activeVenueStorage.test.ts"
Task T004: "client.venueHeader tests in apps/web/tests/api/client.venueHeader.test.ts"
Task T005: "venues.test.tsx skipVenueContext assertion"

# Implement storage → client → venues hook:
Task T006 → T007 → T008
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**critical** — header injection + skipVenueContext)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Switch venues in dashboard; ledger reloads; header sent
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → transport layer ready
2. Add US1 → test independently → **MVP demo**
3. Add US2 → test scope scenarios + E2E → demo
4. Add US3 → test persistence/fallback → demo
5. Polish → coverage gate + quickstart validation

### Parallel Team Strategy

With multiple developers after Phase 2:

- **Developer A**: US1 (T009–T015) — core switcher
- **Developer B**: US2 tests + E2E scaffold (T016–T018) — starts after T012–T013
- **Developer C**: US3 tests (T021–T022) — starts after T012

---

## Notes

- Frontend-only slice: **no backend, DTO, or swagger changes**
- All API types from `apps/web/src/types/generated-api.ts` only (Constitution VI)
- Venue list is server-scoped; client renders verbatim — never filter by `venueScopes` client-side (Constitution II)
- `GET /api/venues` must always use `skipVenueContext: true`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T002 | — |
| Foundational | T003–T008 | — |
| US1 (P1) MVP | T009–T015 | Switch active venue |
| US2 (P2) | T016–T020 | Scope respect |
| US3 (P3) | T021–T024 | Session persistence |
| Polish | T025–T029 | Cross-cutting |
| **Total** | **29 tasks** | |

**Suggested MVP scope**: Phases 1–3 (T001–T015) — 15 tasks delivering core venue switching.
