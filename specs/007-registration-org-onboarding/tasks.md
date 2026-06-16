---
description: "Task list for Registration & Organization Onboarding Flow (SPLR-22)"
---

# Tasks: Registration & Organization Onboarding Flow

**Input**: Design documents from `/specs/007-registration-org-onboarding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they fail before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test -- --coverage` (Vitest → lcov) and a Playwright E2E spec. **No backend changes** in this feature.

**Organization**: Tasks grouped by user story (US1–US3) for independent implementation and testing. Frontend-only (`apps/web` + `tests/e2e`). Builds on completed feature 006 auth layout components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold new directories required by plan.md. No new npm dependencies.

- [X] T001 Create `apps/web/src/components/onboarding/` directory scaffold per plan.md
- [X] T002 [P] Create `apps/web/tests/onboarding/` and `apps/web/tests/pages/` test directory scaffolds per plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth bootstrap, token refresh API, profile-driven context shell, and venues query hook. **No user story work can begin until this phase is complete.**

- [X] T003 [P] Write failing tests for `refreshSession` (`POST /api/auth/refresh` → persist tokens) in `apps/web/tests/auth/authApi.refresh.test.tsx`
- [X] T004 Implement `refreshSession` using `RefreshRequest`/`AuthResponse` from `apps/web/src/types/generated-api.ts` in `apps/web/src/auth/authApi.ts` (make T003 pass)
- [X] T005 [P] Write failing tests for `bootstrapAuthSession` (load `/users/me`, 401→refresh→retry once, refresh fail→`clearTokens`→unauthenticated) in `apps/web/tests/auth/authBootstrap.test.ts`
- [X] T006 Implement `bootstrapAuthSession` and `routeProfile` helper per `contracts/onboarding-flows.md` Flow A/E in `apps/web/src/auth/authBootstrap.ts` (make T005 pass)
- [X] T007 [P] Write failing tests for `useVenues` (`GET /api/venues` → `VenueResponse[]`) in `apps/web/tests/api/venues.test.ts`
- [X] T008 [P] Implement `useVenues` React Query hook in `apps/web/src/api/venues.ts` (make T007 pass)
- [X] T009 Write failing tests for profile-driven `AuthContext` phases (`resolving`/`unauthenticated`/`needs-organization`/`authenticated`, `profile`, `justOnboarded`, `dismissWelcome`) in `apps/web/tests/auth/AuthContext.onboarding.test.tsx`
- [X] T010 Refactor `AuthProvider` to integrate `authBootstrap` on mount and expose `profile`/`justOnboarded`/`dismissWelcome` per `data-model.md` in `apps/web/src/auth/AuthContext.tsx` (make T009 pass)

**Checkpoint**: Bootstrap, refresh API, profile-driven phase machine, and venues hook ready; foundational tests pass.

---

## Phase 3: User Story 1 — New User Onboards and Becomes Admin (Priority: P1) 🎯 MVP

**Goal**: Register → create organization → Admin role → land in dashboard empty state with one-time welcome modal.

**Independent Test**: From signed-out state, complete registration with email/password/org name → dashboard shows empty-state workspace (no venues) and welcome modal → dismiss modal → profile shows Admin role (spec US1, SC-001/SC-002).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Write failing tests for extended onboard orchestration (register→login→createOrg→refresh→profile; 409 duplicate email; org-create failure→needs-organization) in `apps/web/tests/auth/authApi.test.tsx`
- [X] T012 [P] [US1] Write failing tests for `DashboardHome` (empty venues→empty state panel, venues exist→ledger branch, loading/error states) in `apps/web/tests/pages/DashboardHome.test.tsx`
- [X] T013 [P] [US1] Write failing tests for `WelcomeModal` (renders when `justOnboarded`, dismiss calls handler, `role="dialog"`/`aria-modal`, not shown otherwise) in `apps/web/tests/onboarding/WelcomeModal.test.tsx`

### Implementation for User Story 1

- [X] T014 [US1] Extend onboard orchestration with token re-issue and profile confirmation per `contracts/onboarding-flows.md` Flow B in `apps/web/src/auth/authApi.ts` (make T011 pass)
- [X] T015 [P] [US1] Implement `DashboardHome` page with empty-state vs `EventLedgerPage` branch per `contracts/ui-components.md` in `apps/web/src/pages/DashboardHome.tsx` (make T012 pass)
- [X] T016 [P] [US1] Implement `WelcomeModal` component per `contracts/ui-components.md` in `apps/web/src/components/onboarding/WelcomeModal.tsx` (make T013 pass)
- [X] T017 [US1] Wire `onboard`/`register` action setting `justOnboarded=true` and `phase=authenticated` on successful profile with organization in `apps/web/src/auth/AuthContext.tsx`
- [X] T018 [US1] Update auth gate in `apps/web/src/App.tsx` — `authenticated` renders `DashboardHome` + conditional `WelcomeModal` (FR-004, FR-005, FR-005a)
- [X] T019 [P] [US1] Add welcome modal overlay and dashboard empty-state styles in `apps/web/src/index.css`

**Checkpoint**: User Story 1 fully functional — new-user onboarding lands in empty dashboard with welcome modal; duplicate email and org-create failure paths covered.

---

## Phase 4: User Story 2 — Returning User Signs In Without Re-Onboarding (Priority: P2)

**Goal**: Login-only path routes to existing org dashboard (no welcome modal); org-less accounts route to organization-creation step.

**Independent Test**: Sign in with fully onboarded account → dashboard, no org prompt, no welcome modal; sign in with org-less account → `OrganizationCreateStep` (spec US2, SC-003).

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T020 [P] [US2] Write failing tests for login profile routing (`organization` present→`authenticated`, `organization` null→`needs-organization`) in `apps/web/tests/auth/AuthContext.onboarding.test.tsx`
- [X] T021 [P] [US2] Write failing tests for `OrganizationCreateStep` (org name field only, validation, submit disabled while pending, inline error, a11y) in `apps/web/tests/onboarding/OrganizationCreateStep.test.tsx`

### Implementation for User Story 2

- [X] T022 [US2] Refactor `login` action to load `UserProfileResponse` and route via `routeProfile` per `contracts/onboarding-flows.md` Flow C in `apps/web/src/auth/AuthContext.tsx` (make T020 pass)
- [X] T023 [P] [US2] Implement `OrganizationCreateStep` reusing `FormField`/`validateOrganizationName`/`AuthLayout` per `contracts/ui-components.md` in `apps/web/src/components/onboarding/OrganizationCreateStep.tsx` (make T021 pass)
- [X] T024 [US2] Wire `needs-organization` phase to render `OrganizationCreateStep`; redirect authenticated users away from login/register entry screens (FR-006, FR-006a, FR-010) in `apps/web/src/App.tsx`
- [X] T025 [US2] Implement `createOrganization` action (POST `/organizations`→refresh→profile→`justOnboarded=true`) per `contracts/onboarding-flows.md` Flow D in `apps/web/src/auth/AuthContext.tsx`

**Checkpoint**: User Stories 1 AND 2 work independently — returning login and org-less recovery paths functional.

---

## Phase 5: User Story 3 — Authenticated Session Persists Across Reloads (Priority: P3)

**Goal**: Session survives reload and browser restart; expired access token triggers silent refresh; failed refresh clears session.

**Independent Test**: Authenticate → reload → remain in dashboard; remove access token only → reload → silent refresh restores session; invalidate refresh token → reload → login screen (spec US3, FR-007/FR-008/FR-008a, SC-004).

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T026 [P] [US3] Write failing tests for reload persistence and single-attempt refresh-on-401 bootstrap path in `apps/web/tests/auth/authBootstrap.test.ts`
- [X] T027 [P] [US3] Write failing tests for sign-out clearing tokens, React Query cache, `profile`, and `justOnboarded` in `apps/web/tests/auth/AuthContext.onboarding.test.tsx`

### Implementation for User Story 3

- [X] T028 [US3] Ensure `resolving` phase renders non-flickering neutral loading state until bootstrap completes (FR-011) in `apps/web/src/App.tsx` and `apps/web/src/auth/AuthContext.tsx` (make T026 pass)
- [X] T029 [US3] Extend `logout` to clear React Query cache and reset `profile`/`justOnboarded` per `contracts/onboarding-flows.md` Flow F in `apps/web/src/auth/AuthContext.tsx` (make T027 pass)

**Checkpoint**: All three user stories independently functional with durable session and refresh-on-load.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E coverage, Constitution VI audit, coverage gate, and quickstart validation.

- [X] T030 [P] Write Playwright E2E spec covering new-user onboarding→Admin→dashboard, returning login-only, org-less recovery, and reload persistence in `tests/e2e/onboarding.spec.ts`
- [X] T031 [P] Verify no hand-authored API payload interfaces in new/changed files — all auth/onboarding imports from `apps/web/src/types/generated-api.ts` only (Constitution VI)
- [X] T032 Verify ≥80.0% line/branch/function/statement coverage for `apps/web` via `npm run test -- --coverage` in `apps/web/`; missing or unparseable lcov report FAILS (Constitution III; backend unchanged)
- [X] T033 Run manual validation scenarios from `specs/007-registration-org-onboarding/quickstart.md` against local dev (`npm run dev` in `apps/web/`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP; no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 dashboard/welcome wiring (login routes into `DashboardHome`)
- **User Story 3 (Phase 5)**: Depends on Foundational bootstrap (can start tests in parallel with US2 tail; full integration after US1/US2 gates exist)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends on | Independently testable via |
|-------|-----------|---------------------------|
| US1 (P1) | Foundational only | `DashboardHome.test.tsx`, `WelcomeModal.test.tsx`, `authApi.test.tsx` onboard path, manual scenario #1 |
| US2 (P2) | Foundational + US1 gate | `AuthContext.onboarding.test.tsx` login routing, `OrganizationCreateStep.test.tsx`, manual scenarios #4–#5 |
| US3 (P3) | Foundational (+ US1/US2 for full gate) | `authBootstrap.test.ts`, logout tests, manual scenarios #6–#8 |

### Within Each User Story

- Tests written and FAIL before implementation
- Auth/API layer before page components
- Page components before `App.tsx` gate wiring
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T001 ∥ T002
- **Phase 2**: T003+T004 ∥ T005+T006 ∥ T007+T008; then T009 → T010
- **Phase 3**: T011 ∥ T012 ∥ T013; then T015 ∥ T016 ∥ T019; T014 → T017 → T018
- **Phase 4**: T020 ∥ T021; then T023; T022 → T024 → T025
- **Phase 5**: T026 ∥ T027; then T028 ∥ T029
- **Phase 6**: T030 ∥ T031; then T032 → T033
- **Cross-story**: US3 bootstrap tests (T026) can be drafted while US2 implementation (T022–T025) is in progress

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail first):
Task T011: "onboard orchestration tests in apps/web/tests/auth/authApi.test.tsx"
Task T012: "DashboardHome tests in apps/web/tests/pages/DashboardHome.test.tsx"
Task T013: "WelcomeModal tests in apps/web/tests/onboarding/WelcomeModal.test.tsx"

# Launch US1 UI components in parallel after tests exist:
Task T015: "Implement DashboardHome in apps/web/src/pages/DashboardHome.tsx"
Task T016: "Implement WelcomeModal in apps/web/src/components/onboarding/WelcomeModal.tsx"
Task T019: "Add styles in apps/web/src/index.css"
```

---

## Parallel Example: User Story 2

```bash
# Launch US2 tests together:
Task T020: "login profile routing tests in apps/web/tests/auth/AuthContext.onboarding.test.tsx"
Task T021: "OrganizationCreateStep tests in apps/web/tests/onboarding/OrganizationCreateStep.test.tsx"

# Then implement step UI while auth routing lands:
Task T023: "Implement OrganizationCreateStep in apps/web/src/components/onboarding/OrganizationCreateStep.tsx"
Task T022: "Refactor login routing in apps/web/src/auth/AuthContext.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (onboard → Admin → empty dashboard + welcome modal)
4. **STOP and VALIDATE**: Run `npm run test` in `apps/web/`; manual onboarding per quickstart.md scenario #1
5. Demo new-user onboarding flow

### Incremental Delivery

1. Setup + Foundational → profile-driven auth shell ready
2. Add US1 → onboarding + empty dashboard + welcome modal → **MVP demo**
3. Add US2 → returning login + org-less recovery → complete access paths
4. Add US3 → refresh-on-load + durable session + sign-out cache clear → polished persistence
5. Polish → Playwright E2E + coverage gate + quickstart validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (dashboard + welcome modal + onboard wiring)
   - Developer B: US2 tests + `OrganizationCreateStep` (starts after T010)
   - Developer C: US3 bootstrap/logout tests (T026–T027) in parallel with US2 tail
3. Integrate at Phase 6 E2E + coverage gate

---

## Notes

- **Frontend-only**: No backend/DTO/swagger changes; all contracts consumed from `generated-api.ts` (Constitution VI)
- **Builds on 006**: Reuses `AuthLayout`, `RegisterForm`, `LoginForm`, `tokenStorage`, `validation`, and `useUserProfile()` — do not reimplement
- **Profile-driven routing**: `GET /users/me` `organization` nullability is the source of truth (research.md Decision 1)
- **Non-atomic onboarding**: Multi-call sequence with org-create failure recovery documented in `contracts/onboarding-flows.md`
- **Welcome modal**: Transient `justOnboarded` in-memory flag only — not persisted (research.md Decision 4)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
