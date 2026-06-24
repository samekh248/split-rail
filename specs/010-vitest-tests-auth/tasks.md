---

description: "Task list for Vitest coverage of auth layouts and venue selector"
---

# Tasks: Vitest Coverage for Auth Layouts & Venue Selector

**Input**: Design documents from `/specs/010-vitest-tests-auth/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/test-coverage.md

**Tests**: This feature's deliverable *is* the automated tests (Vitest + React Testing Library, Constitution III). Each user-story phase produces/extends test files; the Polish phase enforces the ≥80.0% frontend line/branch coverage gate (CI-enforced; missing/unparseable reports FAIL).

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and validation. Existing `apps/web/tests/**` suites (from features 006/008/009) are **extended/consolidated**, not duplicated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (maps to user stories in spec.md)
- All paths are repo-relative; this feature touches only `apps/web/`

## Path Conventions

- Frontend app under test: `apps/web/src/**`
- Tests: `apps/web/tests/**` (Vitest `include: ['tests/**/*.test.{ts,tsx}']`)
- Shared test assets created by this feature: `apps/web/tests/fixtures/**`, `apps/web/tests/utils/**`

---

## Phase 1: Setup (Shared Test Infrastructure)

**Purpose**: Reusable fixtures/helpers so suites stay DRY during consolidation. All fixtures import contract shapes from `@/types/generated-api` (Constitution VI).

- [ ] T001 [P] Create shared venue fixtures (`multiVenue`, `scopedVenue`, `singleVenue`, `noVenues`) typed as `VenueResponse[]` in `apps/web/tests/fixtures/venues.ts`
- [ ] T002 [P] Create shared profile/role fixtures (`fullAccessProfile`, `restrictedProfile`, `venueScopedProfile`) typed as `UserProfileResponse`/`RoleDetailDto` plus auth input fixtures (`validLogin`, `validRegister`, `emptyInput`, `malformedEmail`, `weakPassword`) in `apps/web/tests/fixtures/auth.ts`
- [ ] T003 [P] Create test provider/render helper (`renderWithProviders` wrapping `QueryClientProvider` + `VenueProvider`/`AuthProvider`) and a `fetch` stub + `resetTestEnv` (clear `sessionStorage`/`localStorage`, `vi.unstubAllGlobals()`) helper in `apps/web/tests/utils/renderWithProviders.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the current baseline so gap-closing is targeted. MUST complete before story phases.

**⚠️ CRITICAL**: No story-phase work begins until the baseline coverage gaps are known.

- [ ] T004 Run `npm run test:coverage` in `apps/web` and record the current pass/fail status plus uncovered auth/venue lines/branches (from the `text` report) as the gap list driving Phases 3–5
- [ ] T005 Reconcile existing auth/venue suites against `contracts/test-coverage.md` (C1–C16): mark each row as already-covered / partial / missing in a short checklist comment block at the top of `apps/web/tests/fixtures/auth.ts` to guide extension vs. addition

**Checkpoint**: Baseline known; fixtures/helpers ready — story phases can proceed (in parallel if staffed).

---

## Phase 3: User Story 1 - Auth forms render and validate (Priority: P1) 🎯 MVP

**Goal**: Verify login/registration forms and pages render required labeled fields and enforce inline validation, form-level errors, and pending state — at both component and page levels.

**Independent Test**: Run `npx vitest run tests/auth` and confirm all auth-form/page rendering, validation, error, and pending assertions pass without any venue/permission work.

### Tests for User Story 1 (REQUIRED) ⚠️

> Tests ARE the deliverable. Each task asserts against the real source module (no stub-only assertions) and uses fixtures/helpers from Phase 1.

- [ ] T006 [P] [US1] Extend `apps/web/tests/auth/LoginForm.test.tsx`: required labeled email/password + submit, empty-submit blocks (`onSubmit` not called), malformed email + weak password messages, form-level `role="alert"` error, pending disables submit (C1, C3, C4, C5, C6)
- [ ] T007 [P] [US1] Extend `apps/web/tests/auth/RegisterForm.test.tsx`: exactly email/password/organization labeled fields + submit (assert no confirm-password field), validation messages, form-level error, pending disables submit (C2, C3, C4, C5, C6)
- [ ] T008 [P] [US1] Extend `apps/web/tests/auth/validation.test.ts`: `validateEmail`/`validatePassword`/`validateOrganizationName` happy + boundary cases (empty, >255 email, <8 / missing upper/lower/digit password, blank org) to cover branches (C4)
- [ ] T009 [P] [US1] Extend `apps/web/tests/auth/FormField.test.tsx`: label-to-input association, `aria-invalid`/`aria-describedby` wiring, error text rendering, disabled state (C4, a11y for C5)
- [ ] T010 [P] [US1] Extend `apps/web/tests/auth/AuthLayout.test.tsx`: renders title, optional subtitle, notice, children, footer slots (C12 shell)
- [ ] T011 [P] [US1] Extend `apps/web/tests/auth/LoginPage.test.tsx`: wires `AuthContext.login`→`LoginForm`, shows session-expired `role="status"` notice, navigates to register, surfaces context error vs. field validation distinction (C1, C12, C13)
- [ ] T012 [P] [US1] Extend `apps/web/tests/auth/RegisterPage.test.tsx`: wires context→`RegisterForm`, surfaces form-level/org-creation error path, navigates to login (C2, C12, C13)
- [ ] T013 [US1] Consolidate US1 suites onto Phase 1 fixtures/helpers and remove duplicated inline fixtures/assertions across the auth suites (depends on T006–T012)

**Checkpoint**: Auth-layout coverage complete and independently green (MVP).

---

## Phase 4: User Story 2 - Venue selector respects user scope (Priority: P2)

**Goal**: Verify the venue selector renders the server-provided (scoped) list verbatim, supports switching with active indication and keyboard operation, and handles single/empty/error/fallback states — at component and dashboard-shell levels.

**Independent Test**: Run `npx vitest run tests/venue tests/pages/DashboardHome.test.tsx` and confirm scope-fidelity, switching, keyboard, and state assertions pass without auth-form or permission work.

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T014 [P] [US2] Extend `apps/web/tests/venue/VenueSwitcher.test.tsx`: renders provided list verbatim (out-of-scope venue never appears; no client filtering), selecting updates active venue, exactly one `aria-selected` option, keyboard open/select, single-venue and no-venue presentations (C7, C8, C9, C10)
- [ ] T015 [P] [US2] Extend `apps/web/tests/venue/VenueContext.test.tsx`: consumes scoped accessible-venues list, default-venue selection on first load, fallback when a remembered venue is no longer accessible (C14)
- [ ] T016 [P] [US2] Extend `apps/web/tests/venue/activeVenueStorage.test.ts`: session-scoped persist/restore within session, clear on sign-out, fallback for stale/invalid stored id (C14)
- [ ] T017 [P] [US2] Add/extend `apps/web/tests/pages/DashboardHome.test.tsx`: hosts `VenueSwitcher`, renders loading (`role="status"`), error + retry (triggers refetch), and empty-state branches (C9, C12, C15)
- [ ] T018 [US2] Consolidate US2 suites onto Phase 1 venue fixtures/helpers and remove duplication (depends on T014–T017)

**Checkpoint**: Venue-selector coverage complete and independently green.

---

## Phase 5: User Story 3 - Permission-gated UI elements are hidden (Priority: P3)

**Goal**: Verify the existing role/permission-conditional controls render only for authorized roles. No new gating is introduced.

**Independent Test**: Run `npx vitest run tests/qbo/SyncNowButton.test.tsx tests/settlement/FinalizeSettlementPanel.test.tsx` and confirm gated controls are absent/disabled for roles lacking the permission and present/enabled when granted.

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T019 [P] [US3] Extend `apps/web/tests/qbo/SyncNowButton.test.tsx`: control absent/disabled when `role.permissions.canTriggerQboSync` is false, present/enabled when true, and the triggered sync remains read-only (no QBO write simulated — Constitution IV) (C11)
- [ ] T020 [P] [US3] Extend `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx`: settlement signing control absent when `role.permissions.canSignSettlement` is false, present when true; any monetary fixture values use generated string/decimal-safe shapes (no JS number math — Constitution I) (C11)

**Checkpoint**: All three stories independently green.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: De-duplication, regression assurance, and the coverage gate.

- [ ] T021 [P] De-duplicate overlapping assertions across all auth/venue/permission suites and ensure every suite imports fixtures from `apps/web/tests/fixtures/**` (no hand-mirrored contract types — Constitution VI)
- [ ] T022 Regression-bite verification per `quickstart.md`: temporarily (a) remove a required auth field, (b) make `VenueSwitcher` render a venue not in the provided list, (c) force a gated control to always render — confirm at least one test fails for each, then revert all temporary changes (SC-004)
- [ ] T023 Coverage gate: run `npm run test:coverage` in `apps/web`; confirm all suites pass and v8 thresholds (lines/branches/functions/statements ≥ 80) are met with an `lcov` report produced; a missing/unparseable report or any threshold miss FAILS (SC-005, C16)
- [ ] T024 Run the full `quickstart.md` validation (targeted suites + full coverage run + acceptance smoke table) and confirm determinism across two consecutive runs (SC-001, SC-002, SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–5)**: All depend on Foundational; independent of each other (can run in parallel if staffed)
- **Polish (Phase 6)**: Depends on all targeted user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on US2/US3
- **US2 (P2)**: After Foundational — independent of US1/US3
- **US3 (P3)**: After Foundational — independent of US1/US2

### Within Each User Story

- Use Phase 1 fixtures/helpers; assert against real source modules
- The per-story consolidation task (T013/T018) runs last within its phase

### Parallel Opportunities

- Setup: T001, T002, T003 in parallel
- US1: T006–T012 in parallel (distinct files); then T013
- US2: T014–T017 in parallel (distinct files); then T018
- US3: T019, T020 in parallel
- Across phases: US1, US2, US3 can be staffed in parallel after Phase 2

---

## Parallel Example: User Story 1

```bash
# Extend all US1 auth suites together (different files, no interdependencies):
Task: "Extend apps/web/tests/auth/LoginForm.test.tsx (C1,C3,C4,C5,C6)"
Task: "Extend apps/web/tests/auth/RegisterForm.test.tsx (C2,C3,C4,C5,C6)"
Task: "Extend apps/web/tests/auth/validation.test.ts (C4)"
Task: "Extend apps/web/tests/auth/FormField.test.tsx"
Task: "Extend apps/web/tests/auth/AuthLayout.test.tsx"
Task: "Extend apps/web/tests/auth/LoginPage.test.tsx (C1,C12,C13)"
Task: "Extend apps/web/tests/auth/RegisterPage.test.tsx (C2,C12,C13)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (fixtures/helpers)
2. Complete Phase 2: Foundational (baseline + gap list)
3. Complete Phase 3: User Story 1 (auth-layout coverage)
4. **STOP and VALIDATE**: `npx vitest run tests/auth` green independently
5. This already closes the highest-priority gap from the source issue

### Incremental Delivery

1. Setup + Foundational → baseline ready
2. US1 → validate `tests/auth` → demo (MVP)
3. US2 → validate venue suites → demo
4. US3 → validate permission-gating suites → demo
5. Polish → coverage gate + regression-bite + quickstart

---

## Notes

- [P] = different files, no dependencies
- Tests ARE the product here; "fail first" applies as the regression-bite check (T022) rather than red-before-green for behavior that already exists
- Reset storage + unstub globals per test for determinism
- Import all payload/contract shapes from `@/types/generated-api` (Constitution VI)
- Keep QBO interactions read-only (Constitution IV); no JS-number money math in fixtures (Constitution I)
- Commit after each task or logical group
