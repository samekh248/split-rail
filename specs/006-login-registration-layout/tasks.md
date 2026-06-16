---
description: "Task list for Login & Registration Layout Components (Responsive) (SPLR-21)"
---

# Tasks: Login & Registration Layout Components (Responsive)

**Input**: Design documents from `/specs/006-login-registration-layout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they fail before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) for independent implementation and testing. Frontend-only (`apps/web`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the auth module directories required by plan.md. No new npm dependencies (React Query, Vitest, RTL already present).

- [x] T001 Create `apps/web/src/auth/` and `apps/web/src/components/auth/` directory scaffold per plan.md
- [x] T002 [P] Create `apps/web/tests/auth/` test directory scaffold per plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared auth primitives — validation, token storage, accessible form field, login API mutation, auth context shell. **No user story work can begin until this phase is complete.**

- [x] T003 [P] Write failing unit tests for email/password/organizationName validators mirroring backend `PasswordValidator` in `apps/web/tests/auth/validation.test.ts`
- [x] T004 [P] Implement `validateEmail`, `validatePassword`, `validateOrganizationName` in `apps/web/src/auth/validation.ts` (make T003 pass)
- [x] T005 [P] Implement `getAccessToken`, `setTokens`, `clearTokens` for `localStorage` keys `accessToken`/`refreshToken` in `apps/web/src/auth/tokenStorage.ts` (align with `apps/web/src/api/client.ts`)
- [x] T006 [P] Write failing component tests for accessible `FormField` (label association, `aria-invalid`, `aria-describedby`, password masking) in `apps/web/tests/auth/FormField.test.tsx`
- [x] T007 [P] Implement reusable `FormField` component per `contracts/ui-components.md` in `apps/web/src/components/auth/FormField.tsx` (make T006 pass)
- [x] T008 Write failing tests for `login` mutation (`POST /api/auth/login` → persist tokens) in `apps/web/tests/auth/authApi.test.tsx`
- [x] T009 Implement `login` mutation using `apiFetch` and generated `LoginRequest`/`AuthResponse` types in `apps/web/src/auth/authApi.ts` (make T008 pass)
- [x] T010 Implement `AuthProvider` with `phase` (`resolving`/`unauthenticated`/`authenticated`), token resolution on mount, and `login` action in `apps/web/src/auth/AuthContext.tsx`
- [x] T011 [P] Export `useAuth` context hook in `apps/web/src/auth/useAuth.ts`
- [x] T012 Wrap `App` with `AuthProvider` inside `QueryClientProvider` in `apps/web/src/main.tsx`
- [x] T013 Add auth-gate shell in `apps/web/src/App.tsx` — `resolving` placeholder, `authenticated` renders existing dashboard, `unauthenticated` placeholder for login (wired in US1)

**Checkpoint**: Validation, token storage, FormField, login API mutation, and auth context resolve; tests pass for foundational modules.

---

## Phase 3: User Story 1 — Returning User Signs In (Priority: P1) 🎯 MVP

**Goal**: Login screen with email + password, inline validation, invalid-credential errors, and routing into the dashboard on success.

**Independent Test**: Navigate to app with no token → login screen renders → submit valid credentials → dashboard (`EventLedgerPage`) appears; submit invalid credentials → inline error, remain on login (spec US1).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T014 [P] [US1] Write failing tests for `LoginForm` (inline validation blocks submit, password masked, form error on 401, submit disabled while pending, a11y associations) in `apps/web/tests/auth/LoginForm.test.tsx`
- [x] T015 [P] [US1] Write failing tests for `LoginPage` (renders form, calls `login` on submit) in `apps/web/tests/auth/LoginPage.test.tsx`

### Implementation for User Story 1

- [x] T016 [P] [US1] Implement `LoginForm` per `contracts/ui-components.md` in `apps/web/src/components/auth/LoginForm.tsx` (make T014 pass)
- [x] T017 [P] [US1] Implement `LoginPage` container wiring `LoginForm` to `useAuth().login` in `apps/web/src/pages/LoginPage.tsx` (make T015 pass)
- [x] T018 [US1] Wire `AuthContext.login` to call `authApi.login`, persist tokens, set `phase = authenticated` in `apps/web/src/auth/AuthContext.tsx`
- [x] T019 [US1] Complete auth gate in `apps/web/src/App.tsx` — `unauthenticated` renders `LoginPage`, `authenticated` renders existing `EventLedgerPage` shell (FR-006)

**Checkpoint**: User Story 1 fully functional — sign-in with validation, error display, and dashboard routing works independently.

---

## Phase 4: User Story 2 — New User Registers an Organization (Priority: P2)

**Goal**: Registration screen with exactly three fields (email, password, organization name), 3-call orchestration (register → login → create-org), auto-login into dashboard.

**Independent Test**: From login, navigate to register → submit valid values → account + organization created → user lands in dashboard without separate sign-in; duplicate email shows inline error with values preserved except password (spec US2).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T020 [P] [US2] Write failing tests for `register` orchestration (3-call sequence, 409 on duplicate email, partial-failure retry on org step only) in `apps/web/tests/auth/authApi.test.tsx`
- [x] T021 [P] [US2] Write failing tests for `RegisterForm` (exactly three fields, no confirm-password, validation, error display, a11y) in `apps/web/tests/auth/RegisterForm.test.tsx`
- [x] T022 [P] [US2] Write failing tests for `RegisterPage` (renders form, calls `register` on submit) in `apps/web/tests/auth/RegisterPage.test.tsx`

### Implementation for User Story 2

- [x] T023 [US2] Implement `register` orchestration (`POST /api/auth/register` → `POST /api/auth/login` → `POST /api/organizations`) with step tracking and sanitized errors per `contracts/auth-flows.md` in `apps/web/src/auth/authApi.ts` (make T020 pass)
- [x] T024 [P] [US2] Implement `RegisterForm` per `contracts/ui-components.md` in `apps/web/src/components/auth/RegisterForm.tsx` (make T021 pass)
- [x] T025 [P] [US2] Implement `RegisterPage` container wiring `RegisterForm` to `useAuth().register` in `apps/web/src/pages/RegisterPage.tsx` (make T022 pass)
- [x] T026 [US2] Wire `AuthContext.register` action and expose `pending`/`error` state in `apps/web/src/auth/AuthContext.tsx`
- [x] T027 [US2] Add login ↔ register view toggle and cross-navigation footer in `apps/web/src/App.tsx` (FR-007); clear transient errors on switch

**Checkpoint**: User Stories 1 AND 2 work independently — full sign-in and registration flows with auto-login.

---

## Phase 5: User Story 3 — Mobile and Desktop Usable Layout (Priority: P3)

**Goal**: Responsive `AuthLayout` shell, focus-visible styles, and layouts usable at ≈375px and ≈1280px without horizontal scroll or clipped fields.

**Independent Test**: Render login and registration at mobile and desktop viewport widths — all fields, actions, and error states visible and operable (spec US3, SC-003).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T028 [P] [US3] Write failing tests for `AuthLayout` (`<main>` landmark, single `<h1>`, children render, footer slot) in `apps/web/tests/auth/AuthLayout.test.tsx`
- [x] T029 [P] [US3] Write failing tests for auth gate edge cases (resolving placeholder, already-authenticated skips login, logout returns to login) in `apps/web/tests/auth/AuthGate.test.tsx`

### Implementation for User Story 3

- [x] T030 [P] [US3] Implement `AuthLayout` responsive shell per `contracts/ui-components.md` in `apps/web/src/components/auth/AuthLayout.tsx` (make T028 pass)
- [x] T031 [US3] Add responsive auth layout styles (mobile ≈375px full-width card, desktop ≈1280px centered max-width, `:focus-visible` outlines) in `apps/web/src/index.css`
- [x] T032 [US3] Refactor `LoginPage` and `RegisterPage` to compose `AuthLayout` with title, subtitle, and cross-nav footer in `apps/web/src/pages/LoginPage.tsx` and `apps/web/src/pages/RegisterPage.tsx`
- [x] T033 [US3] Implement `logout` action (`POST /api/auth/logout` best-effort + `clearTokens`) in `apps/web/src/auth/authApi.ts` and `AuthContext` in `apps/web/src/auth/AuthContext.tsx` (make T029 pass)

**Checkpoint**: All three user stories independently functional with responsive, accessible layout.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, quickstart validation, and final integration checks.

- [x] T034 [P] Verify no hand-authored API payload types were introduced — all auth imports from `apps/web/src/types/generated-api.ts` only
- [x] T035 Verify ≥80.0% line/branch/function/statement coverage for `apps/web` via `npm run test:coverage` in `apps/web/`; missing or unparseable lcov report FAILS
- [x] T036 Run manual validation scenarios from `specs/006-login-registration-layout/quickstart.md` against local dev (`npm run dev` in `apps/web/`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP, no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 auth gate (login screen must exist for navigation toggle; register reuses FormField/validation/auth context)
- **User Story 3 (Phase 5)**: Depends on US1 + US2 pages existing (wraps them in AuthLayout); can start CSS work in parallel with US2 tail
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends on | Independently testable via |
|-------|-----------|---------------------------|
| US1 (P1) | Foundational only | `LoginForm.test.tsx`, `LoginPage.test.tsx`, manual login flow |
| US2 (P2) | Foundational + US1 gate | `RegisterForm.test.tsx`, `authApi.test.tsx` orchestration, manual register flow |
| US3 (P3) | US1 + US2 pages | `AuthLayout.test.tsx`, `AuthGate.test.tsx`, viewport manual checks |

### Within Each User Story

- Tests written and FAIL before implementation
- Presentational components before page containers
- API/auth layer before page wiring
- Story checkpoint before next priority

### Parallel Opportunities

- **Phase 1**: T001 ∥ T002
- **Phase 2**: T003+T004 ∥ T005 ∥ T006+T007; T011 ∥ T009 (after T008)
- **Phase 3**: T014 ∥ T015; T016 ∥ T017 (after tests)
- **Phase 4**: T020 ∥ T021 ∥ T022; T024 ∥ T025 (after tests)
- **Phase 5**: T028 ∥ T029; T030 ∥ T031 (after tests)
- **Phase 6**: T034 ∥ T035
- **Cross-story**: US3 CSS (T031) can start while US2 implementation (T023–T027) is in progress

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must fail first):
Task T014: "Write failing tests for LoginForm in apps/web/tests/auth/LoginForm.test.tsx"
Task T015: "Write failing tests for LoginPage in apps/web/tests/auth/LoginPage.test.tsx"

# Launch US1 components in parallel after tests exist:
Task T016: "Implement LoginForm in apps/web/src/components/auth/LoginForm.tsx"
Task T017: "Implement LoginPage in apps/web/src/pages/LoginPage.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together:
Task T020: "register orchestration tests in apps/web/tests/auth/authApi.test.tsx"
Task T021: "RegisterForm tests in apps/web/tests/auth/RegisterForm.test.tsx"
Task T022: "RegisterPage tests in apps/web/tests/auth/RegisterPage.test.tsx"

# Launch forms in parallel after tests:
Task T024: "Implement RegisterForm in apps/web/src/components/auth/RegisterForm.tsx"
Task T025: "Implement RegisterPage in apps/web/src/pages/RegisterPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (login + dashboard gate)
4. **STOP and VALIDATE**: Run `npm run test` in `apps/web/`; manual login per quickstart.md
5. Demo sign-in flow

### Incremental Delivery

1. Setup + Foundational → auth primitives ready
2. Add US1 → login works → **MVP demo**
3. Add US2 → registration + auto-login → onboarding complete
4. Add US3 → responsive layout + logout + edge cases → polished experience
5. Polish → coverage gate + quickstart validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (login)
   - Developer B: US2 tests + `authApi` orchestration (starts after T009)
   - Developer C: US3 responsive CSS (T031) in parallel with US2 tail
3. Integrate at US3 checkpoint

---

## Notes

- **Frontend-only**: No backend/DTO/swagger changes; registration org name routes to existing `CreateOrganizationRequest` (Constitution VI)
- **No router added**: Auth gate uses `AuthContext` phase + in-app view toggle per research.md D3
- **Non-atomic registration**: 3-call orchestration with partial-failure retry documented in `contracts/auth-flows.md`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
