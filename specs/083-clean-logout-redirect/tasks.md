# Tasks: Clean Logout Redirect

**Input**: Design documents from `/specs/083-clean-logout-redirect/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated Vitest + RTL tasks. Polish verifies ≥80.0% line/branch coverage on changed frontend code. Backend and Playwright are out of scope for this frontend-only navigation fix.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing SPA auth/route surfaces this feature will extend

- [x] T001 Review `apps/web/src/lib/appRoute.ts` `replacePath` / navigation helpers and `apps/web/src/auth/AuthContext.tsx` explicit `logout` plus `handleAutomaticSignOut` against `specs/083-clean-logout-redirect/contracts/logout-navigation.md`
- [x] T002 [P] Note current failing expectations for leftover deep routes after logout in `apps/web/tests/lib/appRoute.test.ts` and `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx` so TDD tasks can assert the missing replace-to-`/` behavior

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared canonical sign-in navigation helper used by every logout path

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add a canonical sign-in navigation helper (for example `navigateToSignIn` or equivalent) in `apps/web/src/lib/appRoute.ts` that uses `replacePath('/')` so pathname, query, and hash are cleared
- [x] T004 Export the helper from any existing route re-export surface used by auth code (for example `apps/web/src/lib/dashboardRoute.ts` only if currently used for auth imports; otherwise keep the import path direct from `appRoute.ts`)
- [x] T005 [P] Add failing unit coverage in `apps/web/tests/lib/appRoute.test.ts` proving the helper replaces a deep route with query and fragment to exactly `/` with empty search and hash

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Intentional logout lands on a clean sign-in page (Priority: P1) 🎯 MVP

**Goal**: Explicit Sign out clears the session and replaces the browser URL with the canonical sign-in location `/`

**Independent Test**: From any authenticated screen, choose Sign out and confirm the sign-in form is shown at `/` with no prior-location path, query, or hash

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Extend `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx` so explicit logout from a deep `window.location` (path + query + hash) ends at `/` with empty search/hash and `sessionExpired === false`
- [x] T007 [P] [US1] Add a case in `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx` (or a focused companion test) proving a rejected `/auth/logout` response still clears local auth state and navigates to `/`

### Implementation for User Story 1

- [x] T008 [US1] Call the canonical sign-in navigation helper from the `logout` `finally` block in `apps/web/src/auth/AuthContext.tsx` after local cleanup (`queryClient.clear`, venue clear, profile/phase reset)
- [x] T009 [US1] Preserve existing explicit-logout semantics in `apps/web/src/auth/AuthContext.tsx` (`sessionExpired` remains false; `authView` set to `login`) while satisfying the clean-URL contract
- [x] T010 [US1] Confirm `apps/web/src/components/shell/ProfileBadge.tsx` still only invokes `logout()` and needs no menu-level redirect logic

**Checkpoint**: Intentional logout from ordinary authenticated pages is independently verifiable

---

## Phase 4: User Story 2 - Logout from nested or sensitive screens still clears location context (Priority: P2)

**Goal**: Deep routes, invite-while-signed-in, and automatic session expiry also converge on clean `/` without return-location parameters

**Independent Test**: Open a deep authenticated route (workspace, festival, settings, or invite while signed in), sign out or expire the session, and verify the same clean sign-in URL/outcome as US1

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T011 [P] [US2] Extend `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx` so automatic sign-out from a deep route replaces the URL with `/` while keeping `sessionExpired === true`
- [x] T012 [P] [US2] Add coverage in `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx` (or `apps/web/tests/App.test.tsx` if more appropriate) for logout while the active path is a deep authenticated route such as `/venues/{id}/events/{id}` or `/settings/team`
- [x] T013 [P] [US2] Add coverage asserting logout while on `/accept-invite` (authenticated) still lands on clean `/` without retaining the invite path or inventing a return-location parameter

### Implementation for User Story 2

- [x] T014 [US2] Invoke the same canonical sign-in navigation helper from `handleAutomaticSignOut` in `apps/web/src/auth/AuthContext.tsx` after local cleanup
- [x] T015 [US2] Ensure automatic sign-out still sets `sessionExpired` true and does not add query parameters for the previous page in `apps/web/src/auth/AuthContext.tsx`
- [x] T016 [US2] Verify `apps/web/src/App.tsx` continues to render `LoginPage` for `phase === 'unauthenticated'` at `/` and that invite-token handling remains unchanged for direct unauthenticated `/accept-invite?token=…` visits

**Checkpoint**: Deep-route and expiry logout share the same clean-URL behavior without regressing invite entry

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, type safety, and quickstart validation across both stories

- [x] T017 [P] Run `npx tsc --noEmit -p apps/web/tsconfig.json` and fix any type errors introduced by logout navigation changes
- [x] T018 [P] Run focused Vitest suites `apps/web/tests/lib/appRoute.test.ts` and `apps/web/tests/auth/AuthContext.sessionExpiry.test.tsx` until green
- [x] T019 Verify ≥80.0% line/branch coverage for changed frontend files via `npm run test:coverage` in `apps/web` (backend N/A; missing/unparseable reports FAIL)
- [x] T020 Walk `specs/083-clean-logout-redirect/quickstart.md` scenarios 1–5 against the running web app and record any remaining gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP
- **User Story 2 (Phase 4)**: Depends on Foundational; reuses US1 helper/integration pattern but remains independently testable
- **Polish (Phase 5)**: Depends on US1 and US2 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on US2
- **User Story 2 (P2)**: Can start after Foundational — shares the Phase 2 helper; should not wait on US1 if staffed separately, but sequential P1→P2 is the recommended solo path

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Route helper before AuthContext wiring
- Explicit logout before automatic/deep-route coverage when working sequentially
- Story complete before moving to the next priority when delivering MVP first

### Parallel Opportunities

- T001 and T002 can proceed together during Setup review
- T005 can be written alongside T003 once the helper name is chosen
- Within US1, T006 and T007 can be authored in parallel
- Within US2, T011, T012, and T013 can be authored in parallel
- T017 and T018 can run in parallel during Polish

---

## Parallel Example: User Story 1

```bash
# Author failing auth tests together:
Task: "Extend AuthContext.sessionExpiry.test.tsx for explicit logout URL cleanup"
Task: "Add rejected logout still navigates to / coverage"

# Then implement the single AuthContext wiring task:
Task: "Call navigateToSignIn from logout finally in AuthContext.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Author failing deep-route / expiry tests together:
Task: "Automatic sign-out replaces deep URL with /"
Task: "Logout from event workspace / settings clears deep path"
Task: "Logout from accept-invite while authenticated lands on /"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational helper + route tests
3. Complete Phase 3: User Story 1 (explicit logout)
4. **STOP and VALIDATE**: Sign out from dashboard/settings and confirm `/`
5. Demo or ship MVP if needed

### Incremental Delivery

1. Setup + Foundational → shared replace-to-`/` helper ready
2. Add User Story 1 → intentional logout clean URL (MVP)
3. Add User Story 2 → deep routes + automatic expiry + invite-while-signed-in
4. Polish → typecheck, focused tests, coverage gate, quickstart walkthrough

### Parallel Team Strategy

1. One developer owns Phase 2 helper
2. After Foundational:
   - Developer A: US1 explicit logout
   - Developer B: US2 automatic/deep-route tests and wiring
3. Integrate in AuthContext carefully to avoid conflicting edits to the same file; prefer sequential AuthContext edits if one person owns that file

---

## Notes

- [P] tasks = different files, no incomplete-task dependencies
- [US1]/[US2] labels map to spec stories
- Canonical destination is always `/` with replace (not push)
- Do not invent returnUrl/from/redirect query parameters
- Invite acceptance for unauthenticated users stays intact until logout occurs
- Avoid: vague tasks, backend work, Playwright suites for this single-user client change
