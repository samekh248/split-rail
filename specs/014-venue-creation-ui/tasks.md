---
description: "Task list for Venue Creation UI with Empty-State CTA feature"
---

# Tasks: Venue Creation UI with Empty-State CTA

**Input**: Design documents from `/specs/014-venue-creation-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/venue-creation-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US4])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/` (regression only — no new backend code)
- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design artifacts before implementation

- [x] T001 Verify feature branch `014-venue-creation-ui` and review design docs in `specs/014-venue-creation-ui/`
- [x] T002 [P] Confirm `CreateVenueRequest` and `VenueResponse` exist in `apps/web/src/types/generated-api.ts`; confirm `POST /api/venues` in OpenAPI matches `specs/011-complete-organization-and/contracts/venues.md`
- [x] T003 [P] Review UI contract in `specs/014-venue-creation-ui/contracts/venue-creation-ui.md` and routing decision in `specs/014-venue-creation-ui/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared routing, permission hook, validation, mutation, and venue-context extensions — MUST complete before user story UI work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing Vitest tests for `useCanManageVenues` in `apps/web/tests/hooks/useCanManageVenues.test.ts`
- [x] T005 [P] Write failing Vitest tests for path navigation helpers in `apps/web/tests/lib/dashboardRoute.test.ts`
- [x] T006 [P] Write failing Vitest tests for `useCreateVenue` cache upsert and invalidation in `apps/web/tests/api/venues.test.tsx`

### Implementation for Foundational

- [x] T007 Implement `dashboardRoute.ts` with `getDashboardPath`, `navigateToCreateVenue`, `navigateToDashboard`, and `useDashboardRoute` in `apps/web/src/lib/dashboardRoute.ts`
- [x] T008 [P] Implement `useCanManageVenues` hook in `apps/web/src/hooks/useCanManageVenues.ts`
- [x] T009 [P] Add `validateVenueName` (required trimmed, max 200 chars) in `apps/web/src/auth/validation.ts`
- [x] T010 Implement `useCreateVenue` mutation with `skipVenueContext: true`, cache upsert, and `['venues']` invalidation in `apps/web/src/api/venues.ts`
- [x] T011 Add `activateVenueId(id)` to `VenueContext` in `apps/web/src/venue/VenueContext.tsx` (persist to sessionStorage without requiring id ∈ current venues list)
- [x] T012 Branch authenticated render on `/` vs `/venues/new` in `apps/web/src/App.tsx` per `specs/014-venue-creation-ui/contracts/venue-creation-ui.md`
- [x] T013 Run foundational unit tests until T004–T006 pass: `cd apps/web && npm run test -- tests/hooks/useCanManageVenues.test.ts tests/lib/dashboardRoute.test.ts tests/api/venues.test.tsx`

**Checkpoint**: Routing, permission hook, validation, and create mutation ready — user story phases can begin

---

## Phase 3: User Story 1 - Admin creates their first venue from the dashboard empty state (Priority: P1) 🎯 MVP

**Goal**: Empty-state CTA navigates to create page; successful submit returns to dashboard with new venue active and ledger visible

**Independent Test**: Sign in as admin with zero venues → click empty-state **Add venue** → submit valid name → dashboard shows ledger with new venue active

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T014 [P] [US1] Write failing Vitest tests for create-page success flow (submit → navigate `/` → active venue) in `apps/web/tests/pages/CreateVenuePage.test.tsx`
- [x] T015 [P] [US1] Write failing Vitest test for empty-state CTA visibility and navigation in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 1

- [x] T016 [US1] Create `CreateVenuePage` with `AuthLayout`, `FormField`, submit/cancel, and success navigation in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T017 [US1] Wire `useCreateVenue`, `activateVenueId`, and `navigateToDashboard` on success in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T018 [US1] Add empty-state primary **Add venue** CTA (visible when `venues.length === 0 && useCanManageVenues()`) in `apps/web/src/pages/DashboardHome.tsx`
- [x] T019 [US1] Run US1 tests until T014–T015 pass: `cd apps/web && npm run test -- tests/pages/CreateVenuePage.test.tsx tests/pages/DashboardHome.test.tsx`

**Checkpoint**: User Story 1 fully functional — first venue creatable from empty state

---

## Phase 4: User Story 2 - Admin adds another venue from the dashboard shell (Priority: P2)

**Goal**: Persistent header **Add venue** action navigates to same create page; success selects new venue and reloads workspace

**Independent Test**: Sign in as admin with ≥1 venue → click header **Add venue** → create second venue → new venue active in switcher

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T020 [P] [US2] Write failing Vitest tests for header **Add venue** visibility and navigation in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 2

- [x] T021 [US2] Add persistent header **Add venue** action in `app__header-actions` (visible when `useCanManageVenues()`, any venue count) in `apps/web/src/pages/DashboardHome.tsx`
- [x] T022 [US2] Verify post-create workspace reload uses new active venue when prior venues existed (extend success handler if needed) in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T023 [US2] Run US2 tests until T020 passes: `cd apps/web && npm run test -- tests/pages/DashboardHome.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Users without venue-management permission see a read-only empty state (Priority: P3)

**Goal**: Non-permitted users never see create affordances; direct `/venues/new` silently redirects to dashboard

**Independent Test**: Sign in as non-admin → no CTA or header action; navigate to `/venues/new` → silent redirect to `/`

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T024 [P] [US3] Write failing Vitest tests for hidden CTA/header when `canManagePermissions` is false in `apps/web/tests/pages/DashboardHome.test.tsx`
- [x] T025 [P] [US3] Write failing Vitest test for silent redirect on create page when permission denied in `apps/web/tests/pages/CreateVenuePage.test.tsx`

### Implementation for User Story 3

- [x] T026 [US3] Hide empty-state CTA and header **Add venue** when `!useCanManageVenues()` in `apps/web/src/pages/DashboardHome.tsx`
- [x] T027 [US3] Add read-only empty-state copy for non-permitted users in `apps/web/src/pages/DashboardHome.tsx`
- [x] T028 [US3] Implement permission guard on mount (silent `navigateToDashboard()` when `!useCanManageVenues()`) in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T029 [US3] Run US3 tests until T024–T025 pass: `cd apps/web && npm run test -- tests/pages/DashboardHome.test.tsx tests/pages/CreateVenuePage.test.tsx`

**Checkpoint**: Permission gating complete for all entry points

---

## Phase 6: User Story 4 - Venue name validation and creation errors are handled clearly (Priority: P4)

**Goal**: Inline validation for empty/over-length names; submit disabled while pending; server/network errors shown without losing entered name

**Independent Test**: Submit empty name → inline error, no POST; double-submit blocked; simulated 500 shows banner with name retained

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T030 [P] [US4] Write failing Vitest tests for validation, pending disable, and error banner in `apps/web/tests/pages/CreateVenuePage.test.tsx`

### Implementation for User Story 4

- [x] T031 [US4] Wire `validateVenueName` on blur/submit with inline `FormField` errors in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T032 [US4] Disable submit while `useCreateVenue` is pending and map API errors to banner messages in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T033 [US4] Implement cancel/back navigation via `navigateToDashboard()` without mutation in `apps/web/src/pages/CreateVenuePage.tsx`
- [x] T034 [US4] Run US4 tests until T030 passes: `cd apps/web && npm run test -- tests/pages/CreateVenuePage.test.tsx`

**Checkpoint**: All user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, backend regression, and quickstart validation

- [x] T035 [P] Add minimal CSS for header **Add venue** action if needed (reuse existing `app__header-actions` patterns) in `apps/web/src/index.css` or co-located module
- [x] T036 Verify ≥80.0% line/branch coverage for frontend via `cd apps/web && npm run test:coverage`; missing or unparseable lcov report FAILs
- [x] T037 Run backend venue API regression: `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~VenuesControllerTests"`
- [x] T038 Run manual scenarios A–D from `specs/014-venue-creation-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories (MVP)
- **User Story 2 (P2)**: After Foundational — builds on `CreateVenuePage` from US1 but independently testable via header action
- **User Story 3 (P3)**: After Foundational — can parallel US1/US2 if permission checks added incrementally; tests assume page exists
- **User Story 4 (P4)**: After US1 (`CreateVenuePage` exists) — hardens validation/error paths

### Within Each User Story

- Tests written and FAIL before implementation
- Story checkpoint before next priority

### Parallel Opportunities

- T002, T003 (Setup)
- T004, T005, T006 (Foundational tests)
- T008, T009 (Foundational impl — different files)
- T014, T015 (US1 tests)
- T024, T025 (US3 tests)
- T035 parallel with T036–T037 in Polish

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
# tests/pages/CreateVenuePage.test.tsx — success flow
# tests/pages/DashboardHome.test.tsx — empty-state CTA

# After foundational complete, implement:
# apps/web/src/pages/CreateVenuePage.tsx
# apps/web/src/pages/DashboardHome.tsx (CTA only)
```

---

## Parallel Example: Foundational

```bash
# Launch foundational tests together:
cd apps/web && npm run test -- tests/hooks/useCanManageVenues.test.ts tests/lib/dashboardRoute.test.ts tests/api/venues.test.tsx

# Parallel implementation (different files):
# apps/web/src/hooks/useCanManageVenues.ts
# apps/web/src/auth/validation.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: First venue from empty state (quickstart Scenario A)
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready
2. US1 → first venue from empty state (MVP)
3. US2 → header action for additional venues
4. US3 → permission hardening
5. US4 → validation/error polish
6. Polish → coverage + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Foundational:
   - Developer A: US1 + US2 (DashboardHome + CreateVenuePage)
   - Developer B: US3 + US4 (permission + validation tests/impl)
3. Merge and run Polish phase

---

## Notes

- No backend code changes expected; T037 confirms existing API still passes
- Use `skipVenueContext: true` on all venue-list and create calls (009 D2)
- Post-create: upsert cache → `activateVenueId` → `navigateToDashboard()` (research D5)
- Commit after each task or logical group
