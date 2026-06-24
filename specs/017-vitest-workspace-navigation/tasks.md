---

description: "Task list for Vitest coverage of workspace navigation and tenant management UX"
---

# Tasks: Vitest Coverage for Workspace Navigation & Tenant Management UX

**Input**: Design documents from `/specs/017-vitest-workspace-navigation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/test-coverage.md

**Tests**: This feature's deliverable *is* the automated tests (Vitest + React Testing Library, Constitution III). Each user-story phase extends/consolidates existing `apps/web/tests/**` suites; the Polish phase enforces the ≥80.0% frontend line/branch coverage gate (CI-enforced; missing/unparseable reports FAIL).

**Organization**: Tasks grouped by user story (US1–US4). Existing suites from features 014–016 are **extended/consolidated**, not duplicated. Event edit/delete (feature 015) and org/venue rename forms are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3, US4 (maps to user stories in spec.md)
- All paths are repo-relative; this feature touches only `apps/web/`

## Path Conventions

- Frontend app under test: `apps/web/src/**`
- Tests: `apps/web/tests/**` (Vitest `include: ['tests/**/*.test.{ts,tsx}']`)
- Shared test assets: `apps/web/tests/fixtures/**`, `apps/web/tests/utils/**`

---

## Phase 1: Setup (Shared Test Infrastructure)

**Purpose**: Extend shared fixtures/helpers for workspace/tenant suites. Reuse existing `venues.ts`, `auth.ts`, and `renderWithProviders.tsx` from feature 010.

- [x] T001 [P] Create shared event fixtures (`EVENT_A`, `EVENT_B`, `eventsForVenueA`, `noEvents`, `newlyCreatedEvent` stub) typed from `@/types/generated-api` in `apps/web/tests/fixtures/events.ts`
- [x] T002 [P] Create shared team fixtures (`pendingInvitation`, `acceptedInvitation`, `orgMember`, `orgMemberScoped`, `roleOptions`, `venueOptions`) typed from `@/types/generated-api` in `apps/web/tests/fixtures/team.ts`
- [x] T003 [P] Add workspace `fetch` stub helper (`mockWorkspaceFetch` with profile/venues/events/members/invitations knobs) and document permission stub mapping (`canManagePermissions` → venues/team, `canViewFinancials` → events) in `apps/web/tests/utils/mockWorkspaceFetch.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish baseline against the coverage matrix before story phases.

**⚠️ CRITICAL**: No story-phase work begins until gaps are catalogued.

- [x] T004 Run `npm run test:coverage` in `apps/web` and record pass/fail status plus uncovered workspace/tenant lines/branches from the `text` report
- [x] T005 Reconcile existing workspace/tenant suites against `specs/017-vitest-workspace-navigation/contracts/test-coverage.md` (W1–W32): mark each row as covered / partial / **GAP** in a comment block at the top of `apps/web/tests/fixtures/events.ts`

**Checkpoint**: Baseline known; fixtures/helpers ready — story phases can proceed.

---

## Phase 3: User Story 1 - Venue workspace and creation flows (Priority: P1) 🎯 MVP

**Goal**: Verify venue empty states, creation affordances, create-venue validation, successful create flow, and unauthorized redirect.

**Independent Test**: `npx vitest run tests/pages/DashboardHome.test.tsx tests/pages/CreateVenuePage.test.tsx` — all venue-workspace assertions pass without event/settings/team work.

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T006 [P] [US1] Extend `apps/web/tests/pages/DashboardHome.test.tsx`: add test for persistent shell "Add venue" when venues exist for `fullAccessProfile` (W2)
- [x] T007 [P] [US1] Extend `apps/web/tests/pages/DashboardHome.test.tsx`: add test hiding `empty-state-add-venue` for `restrictedProfile` with zero venues (W3)
- [x] T008 [P] [US1] Extend `apps/web/tests/pages/DashboardHome.test.tsx`: add test hiding shell add-venue action for `restrictedProfile` with existing venues (W4)
- [x] T009 [P] [US1] Extend `apps/web/tests/pages/CreateVenuePage.test.tsx`: add over-max-length venue name validation blocking submit (W6)
- [x] T010 [US1] Consolidate `apps/web/tests/pages/DashboardHome.test.tsx` and `apps/web/tests/pages/CreateVenuePage.test.tsx` onto Phase 1 fixtures (`venues.ts`, `auth.ts`, `mockWorkspaceFetch.ts`); verify W1, W5, W7, W8, W28, W29 remain green (depends on T006–T009)

**Checkpoint**: Venue workspace coverage complete and independently green (MVP).

---

## Phase 4: User Story 2 - Event picker and selection transitions (Priority: P2)

**Goal**: Verify event combobox scoping, selection updates ledger, no-events CTA gating, inline create → ledger, venue-switch reset, and events error/retry.

**Independent Test**: `npx vitest run tests/pages/DashboardHome.test.tsx tests/components/event` — event navigation assertions pass without settings/team work. Edit/delete cases are **not** in scope (feature 015).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T011 [P] [US2] Extend `apps/web/tests/pages/DashboardHome.test.tsx`: add page-level inline create-event flow asserting new event selected and `mock-ledger-page` shown (W13)
- [x] T012 [P] [US2] Extend `apps/web/tests/components/event/EventCombobox.test.tsx`: assert venue-scoped events render with title/date; no cross-venue leakage (W9)
- [x] T013 [P] [US2] Extend `apps/web/tests/components/event/EventFormPanel.test.tsx`: create-mode validation (empty title/date) supporting dashboard create flow (W13 helper)
- [x] T014 [US2] Consolidate US2 suites onto `events.ts` fixtures and `mockWorkspaceFetch.ts`; verify W10, W11, W12, W14, W30 remain green (depends on T011–T013)

**Checkpoint**: Event selection coverage complete and independently green.

---

## Phase 5: User Story 3 - Settings hub navigation and permission gating (Priority: P3)

**Goal**: Verify settings landing navigation, Team card gating, silent redirect from `/settings/team`, and placeholder org/integrations pages.

**Independent Test**: `npx vitest run tests/pages/SettingsLandingPage.test.tsx tests/pages/PlaceholderSettingsPage.test.tsx tests/pages/TeamSettingsPage.test.tsx tests/App.test.tsx tests/lib/appRoute.test.ts` — settings assertions pass. Rename-form tests are **out of scope**.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T015 [P] [US3] Add `apps/web/tests/components/settings/SettingsNav.test.tsx`: nav items render; Team link hidden for `useCanManageTeam` false; org/integrations links present (W16)
- [x] T016 [P] [US3] Extend `apps/web/tests/pages/SettingsLandingPage.test.tsx`: verify org + integrations card navigation and Team card show/hide (W16, W17)
- [x] T017 [P] [US3] Extend `apps/web/tests/pages/PlaceholderSettingsPage.test.tsx` and `apps/web/tests/App.test.tsx`: placeholder copy and `/settings/organization` + `/settings/integrations` routing (W19)
- [x] T018 [US3] Extend `apps/web/tests/pages/TeamSettingsPage.test.tsx`: assert silent redirect to `/settings` for non-admin with no error message (W18); consolidate onto shared fixtures (depends on T015–T017)

**Checkpoint**: Settings hub coverage complete and independently green.

---

## Phase 6: User Story 4 - Team management components and page integration (Priority: P4)

**Goal**: Full team component coverage plus team settings page integration.

**Independent Test**: `npx vitest run tests/components/team tests/pages/TeamSettingsPage.test.tsx` — all team assertions pass independently.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T019 [P] [US4] Extend `apps/web/tests/components/team/InviteMemberForm.test.tsx`: required fields, invalid email blocked, pending disables submit, server error banner vs inline validation (W21, W28, W29)
- [x] T020 [P] [US4] Extend `apps/web/tests/components/team/InvitationList.test.tsx`: scoped data rendering; resend/cancel for pending; absent for accepted (W23, W24)
- [x] T021 [P] [US4] Extend `apps/web/tests/components/team/MemberList.test.tsx`: email, role, venue scope summary from stubbed data (W22)
- [x] T022 [P] [US4] Extend `apps/web/tests/components/team/MemberEditModal.test.tsx`: save/cancel/last-admin guard (W25)
- [x] T023 [P] [US4] Extend `apps/web/tests/components/team/RemoveMemberConfirm.test.tsx`: confirm proceeds; cancel aborts (W26)
- [x] T024 [US4] Extend `apps/web/tests/pages/TeamSettingsPage.test.tsx`: page integration — invite form, lists, submit invite success (W27); consolidate all US4 suites onto `team.ts` fixtures (depends on T019–T023)

**Checkpoint**: All four user stories independently green.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: De-duplication, regression assurance, and the coverage gate.

- [x] T025 [P] De-duplicate overlapping profile/venue/event fixtures across page suites; ensure all workspace tests import from `apps/web/tests/fixtures/**` and `@/types/generated-api` only (Constitution VI)
- [x] T026 Regression-bite verification per `quickstart.md`: temporarily (a) show venue CTA for `restrictedProfile`, (b) allow team page without permission, (c) leak cross-venue event in combobox — confirm at least one test fails each, then revert (SC-004)
- [x] T027 Coverage gate: run `npm run test:coverage` in `apps/web`; confirm all suites pass and v8 thresholds (lines/branches/functions/statements ≥ 80) met with `lcov` produced; missing/unparseable report FAILS (SC-005, W32)
- [x] T028 Run full `specs/017-vitest-workspace-navigation/quickstart.md` validation (targeted suites + coverage + smoke table); confirm determinism across two consecutive runs (SC-001, SC-002, SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Foundational; independent of each other (can run in parallel if staffed)
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on US2/US3/US4
- **US2 (P2)**: After Foundational — independent of US1/US3/US4
- **US3 (P3)**: After Foundational — independent of US1/US2/US4
- **US4 (P4)**: After Foundational — independent of US1/US2/US3

### Within Each User Story

- Use Phase 1 fixtures/helpers; assert against real source modules
- Per-story consolidation task runs last within its phase

### Parallel Opportunities

- Setup: T001, T002, T003 in parallel
- US1: T006–T009 in parallel; then T010
- US2: T011–T013 in parallel; then T014
- US3: T015–T017 in parallel; then T018
- US4: T019–T023 in parallel; then T024
- Across phases: US1–US4 can be staffed in parallel after Phase 2

---

## Parallel Example: User Story 1

```bash
# Close venue-workspace GAP rows together (different files):
Task: "Extend apps/web/tests/pages/DashboardHome.test.tsx — W2 shell add-venue"
Task: "Extend apps/web/tests/pages/DashboardHome.test.tsx — W3/W4 permission gating"
Task: "Extend apps/web/tests/pages/CreateVenuePage.test.tsx — W6 max-length validation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (event/team fixtures + fetch helper)
2. Complete Phase 2: Foundational (baseline + W-matrix reconciliation)
3. Complete Phase 3: User Story 1 (venue workspace gaps W2–W4, W6)
4. **STOP and VALIDATE**: `npx vitest run tests/pages/DashboardHome.test.tsx tests/pages/CreateVenuePage.test.tsx` green
5. Closes the highest-priority SPLR-61 gap (venue onboarding verification)

### Incremental Delivery

1. Setup + Foundational → baseline ready
2. US1 → validate venue suites → demo (MVP)
3. US2 → validate event suites → demo
4. US3 → validate settings suites → demo
5. US4 → validate team suites → demo
6. Polish → coverage gate + regression-bite + quickstart

---

## Notes

- [P] = different files, no dependencies
- Tests ARE the product; regression-bite (T026) proves assertions bite
- Reset storage + unstub globals per test for determinism
- Silent redirect canonical for `/venues/new` and `/settings/team` unauthorized access
- Do not duplicate feature 010 (auth/venue switcher) or feature 015 (event edit/delete) coverage
- Org/venue rename-form tests deferred to a future rename UI feature
