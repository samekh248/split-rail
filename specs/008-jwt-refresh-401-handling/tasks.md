---
description: "Task list for JWT Persistence, Refresh Rotation & 401 Handling in API Client (SPLR-23)"
---

# Tasks: JWT Persistence, Refresh Rotation & 401 Handling in API Client

**Input**: Design documents from `/specs/008-jwt-refresh-401-handling/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they fail before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test -- --coverage` (Vitest → lcov) and a Playwright E2E spec. **No backend changes** in this feature.

**Organization**: Tasks grouped by user story (US1–US3) for independent implementation and testing. Frontend-only (`apps/web` + `tests/e2e`). Builds on feature 007 (`tokenStorage`, `authBootstrap`, `authApi.refreshSession`, `AuthContext` phase machine).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold directories required by plan.md. No new npm dependencies.

- [X] T001 Create `tests/e2e/specs/auth/` directory scaffold per plan.md
- [X] T002 [P] Create `apps/web/tests/api/client.refresh.test.ts` test file scaffold per plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Registration seam, recursion guard, and `tokenStorage` integration. **No user story work can begin until this phase is complete.**

- [X] T003 Export `configureApiClient`, `SessionExpiredError`, and internal request-flag types (`skipAuthRecovery`, `isRetry`) in `apps/web/src/api/client.ts` per `contracts/api-client-recovery.md`
- [X] T004 [P] Write failing tests for `refreshSession` recursion guard (`skipAuthRecovery` on `/auth/refresh`, no nested recovery) in `apps/web/tests/auth/authApi.refresh.test.tsx`
- [X] T005 Extend `refreshSession` to call `apiFetch('/auth/refresh', { skipAuthRecovery: true })` in `apps/web/src/auth/authApi.ts` (make T004 pass)
- [X] T006 [P] Refactor `authHeaders()` in `apps/web/src/api/client.ts` to read via `tokenStorage.getAccessToken()` instead of direct `localStorage` and keep `apps/web/tests/api/client.test.ts` green (FR-001, FR-002)
- [X] T007 [P] Write failing tests for `configureApiClient` handler registration (stored `onRefresh`/`onSessionExpired` invokable) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T008 Implement `configureApiClient({ onRefresh, onSessionExpired })` module storage in `apps/web/src/api/client.ts` (make T007 pass)

**Checkpoint**: Registration seam, recursion guard, and `tokenStorage` integration ready; foundational tests pass.

---

## Phase 3: User Story 1 — Stay Signed In When Access Token Expires Mid-Session (Priority: P1) 🎯 MVP

**Goal**: Transparent 401 → refresh → replay-once recovery so in-progress actions succeed without user interruption.

**Independent Test**: Sign in, invalidate `accessToken` only, trigger any authenticated request → action succeeds, user stays on screen, no error (spec US1, SC-002).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Write failing tests for 401→`onRefresh`→replay-once→success and non-401 pass-through without refresh (contract §2–3) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T010 [P] [US1] Write failing tests for POST replay preserving `method`/`body`/`headers` (contract §4, FR-014) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T011 [P] [US1] Write failing tests for `/auth/refresh` with `skipAuthRecovery` bypassing recovery on 401 (contract §10, FR-009) in `apps/web/tests/api/client.refresh.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement 401 recovery path with single replay (`isRetry`) and non-401 unchanged error surfacing in `apps/web/src/api/client.ts` (make T009 pass)
- [X] T013 [US1] Ensure write-method replay preserves original request init in `apps/web/src/api/client.ts` (make T010 pass)

**Checkpoint**: User Story 1 fully functional — mid-session token expiry recovers transparently for reads and writes.

---

## Phase 4: User Story 2 — Safely Signed Out When Session Cannot Be Recovered (Priority: P1)

**Goal**: Unrecoverable auth failure clears credentials, best-effort server logout, routes to login with session-expired notice; network blips retain credentials.

**Independent Test**: Invalidate both tokens → trigger request → login screen with "Your session expired — please sign in again." notice; sign in again restores access (spec US2, SC-005, SC-006).

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T014 [P] [US2] Write failing tests for auth-failed refresh→`SessionExpiredError`+`onSessionExpired` and no-refresh-token immediate sign-out (contract §5–6) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T015 [P] [US2] Write failing tests for network-failed refresh retaining credentials without `onSessionExpired` (contract §7, FR-015, SC-007) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T016 [P] [US2] Write failing tests for retry-once cap (replay still 401→sign-out, no second refresh) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T017 [P] [US2] Write failing tests for `handleAutomaticSignOut` (best-effort logout, clear tokens, `phase='unauthenticated'`, `sessionExpired=true`) per `contracts/ui-components.md` in `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx`
- [X] T018 [P] [US2] Write failing tests for login session-expired notice (`role="status"`, shown/hidden) per `contracts/ui-components.md` in `apps/web/tests/auth/LoginPage.test.tsx`

### Implementation for User Story 2

- [X] T019 [US2] Implement auth-failure vs network-failure classification and `SessionExpiredError` propagation in `apps/web/src/api/client.ts` (make T014, T015, T016 pass)
- [X] T020 [US2] Wire `configureApiClient` on mount, add `sessionExpired` to `AuthContextValue`, and implement `handleAutomaticSignOut` per `contracts/ui-components.md` in `apps/web/src/auth/AuthContext.tsx` (make T017 pass)
- [X] T021 [P] [US2] Render session-expired notice above `LoginForm` via `useAuth().sessionExpired` in `apps/web/src/pages/LoginPage.tsx` (optional notice slot on `apps/web/src/components/auth/AuthLayout.tsx`) (make T018 pass)
- [X] T022 [P] [US2] Add session-expired notice styles in `apps/web/src/index.css`
- [X] T023 [US2] Reset `sessionExpired=false` on explicit `logout()` and successful `login()` in `apps/web/src/auth/AuthContext.tsx` (FR-017)

**Checkpoint**: User Stories 1 AND 2 work independently — transparent recovery and safe automatic sign-out with notice.

---

## Phase 5: User Story 3 — Concurrent Requests Recover Without Refresh Storm (Priority: P2)

**Goal**: Parallel 401s coordinate through single-flight refresh; exactly one sign-out on concurrent unrecoverable failures.

**Independent Test**: Invalidate `accessToken` only, fire multiple `apiFetch` calls concurrently → exactly one refresh, all succeed (spec US3, SC-004).

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T024 [P] [US3] Write failing tests for single-flight concurrent 401 dedup (`onRefresh` called once, all requests resolve) per contract §8 in `apps/web/tests/api/client.refresh.test.ts`
- [X] T025 [P] [US3] Write failing tests for concurrent unrecoverable session (`onSessionExpired` called once, consistent `SessionExpiredError`) in `apps/web/tests/api/client.refresh.test.ts`

### Implementation for User Story 3

- [X] T026 [US3] Implement `refreshInFlight` single-flight promise coordination in `apps/web/src/api/client.ts` (make T024 pass)
- [X] T027 [US3] Ensure `onSessionExpired` fires exactly once for concurrent auth-failures in `apps/web/src/api/client.ts` (make T025 pass)

**Checkpoint**: All three user stories independently functional with coordinated concurrent recovery.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Privacy guard, E2E coverage, Constitution VI audit, coverage gate, and quickstart validation.

- [X] T028 [P] Write failing test for no access/refresh token written to `console.*` across recovery paths (contract §11, FR-013) in `apps/web/tests/api/client.refresh.test.ts`
- [X] T029 Verify token/console privacy across recovery and sign-out paths in `apps/web/src/api/client.ts` (make T028 pass)
- [X] T030 [P] Audit changed files import auth payloads only from `apps/web/src/types/generated-api.ts` — no hand-authored DTOs (Constitution VI)
- [X] T031 [P] Write Playwright E2E spec for transparent refresh, concurrent burst, and unrecoverable→login-with-notice per `contracts/ui-components.md` in `tests/e2e/specs/auth/session-refresh.spec.ts`
- [X] T032 Verify ≥80.0% line/branch coverage for changed frontend code via `npm run test -- --coverage` in `apps/web/` (Vitest → lcov); missing or unparseable reports FAIL (Constitution III)
- [X] T033 Run manual validation scenarios A–D in `specs/008-jwt-refresh-401-handling/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational; integrates with US1's `onSessionExpired` signal from `client.ts` (T019 before T020 wiring is ideal, but T017 can use injected fakes in isolation)
- **User Story 3 (Phase 5)**: Depends on US1 recovery path in `client.ts` (extends same module)
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — independently testable with fake `configureApiClient` handlers
- **User Story 2 (P1)**: After Foundational; end-to-end sign-out needs US1's recovery to emit `onSessionExpired` (T019 → T020)
- **User Story 3 (P2)**: After US1 — extends `client.ts` single-flight layer

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- `client.ts` changes are sequential within a story (same file)
- UI tasks (LoginPage, styles) can run in parallel with each other after T020

### Parallel Opportunities

- **Phase 1**: T001 and T002 in parallel
- **Phase 2**: T004, T006, T007 in parallel after T003
- **Phase 3 tests**: T009, T010, T011 in parallel
- **Phase 4 tests**: T014–T018 in parallel
- **Phase 4 impl**: T021 and T022 in parallel after T020
- **Phase 5 tests**: T024 and T025 in parallel
- **Phase 6**: T028, T030, T031 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (after Foundational):
Task: "Write failing tests for 401→refresh→replay in apps/web/tests/api/client.refresh.test.ts"
Task: "Write failing tests for POST replay in apps/web/tests/api/client.refresh.test.ts"
Task: "Write failing tests for recursion guard in apps/web/tests/api/client.refresh.test.ts"

# Then implement sequentially in client.ts:
Task: "Implement 401 recovery path in apps/web/src/api/client.ts"
Task: "Ensure write-method replay in apps/web/src/api/client.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together:
Task: "Write failing tests for auth-failed refresh in apps/web/tests/api/client.refresh.test.ts"
Task: "Write failing tests for network-failed refresh in apps/web/tests/api/client.refresh.test.ts"
Task: "Write failing tests for handleAutomaticSignOut in apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx"
Task: "Write failing tests for login notice in apps/web/tests/auth/LoginPage.test.tsx"

# UI polish in parallel after AuthContext wiring:
Task: "Render session-expired notice in apps/web/src/pages/LoginPage.tsx"
Task: "Add notice styles in apps/web/src/index.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Invalidate `accessToken` only → request succeeds transparently
5. Demo mid-session recovery

### Incremental Delivery

1. Setup + Foundational → registration seam and recursion guard ready
2. User Story 1 → transparent mid-session refresh (MVP)
3. User Story 2 → safe sign-out + session-expired notice
4. User Story 3 → concurrent single-flight coordination
5. Polish → E2E, coverage gate, quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (`client.ts` recovery core)
   - Developer B: User Story 2 tests + `AuthContext`/`LoginPage` (after US1 T012 or with fakes)
3. Developer A adds User Story 3 single-flight after US1 merges
4. Polish phase together

---

## Notes

- Feature 007 already delivered on-load bootstrap (`authBootstrap.ts`) and token persistence (`tokenStorage.ts`); do **not** re-implement those paths
- `authBootstrap.ts` should remain consistent with mid-session recovery but requires no changes unless integration tests reveal a conflict
- All auth payloads (`AuthResponse`, `RefreshRequest`) MUST come from `generated-api.ts` — no swagger regeneration needed
- `[P]` tasks = different files, no dependencies on incomplete tasks in the same phase
- Verify tests fail before implementing; stop at any checkpoint to validate story independently
