---
description: "Task list for Team Invitation & User Management UI feature"
---

# Tasks: Team Invitation & User Management UI

**Input**: Design documents from `/specs/016-team-invitation-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/team-invitation-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate on backend and frontend independently.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US5])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/`
- Frontend: `apps/web/src/`, `apps/web/tests/`
- E2E: `tests/e2e/specs/team/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm environment and design artifacts before implementation

- [X] T001 Verify feature branch `016-team-invitation-ui` and review design docs in `specs/016-team-invitation-ui/`
- [X] T002 [P] Confirm existing invitation, user, and role endpoints in `apps/web/src/types/generated-api.ts`; note missing `venueScopes` on `InvitationResponse` per `specs/016-team-invitation-ui/research.md`
- [X] T003 [P] Review UI contract in `specs/016-team-invitation-ui/contracts/team-invitation-ui.md` and hybrid backend scope in `specs/016-team-invitation-ui/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend DTO extension, type regeneration, routing, Settings shell, shared API hooks — MUST complete before user story UI work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] Write failing xUnit tests asserting `venueScopes` on invitation list/create/resend responses in `apps/api.tests/Integration/InvitationsControllerTests.cs`
- [X] T005 [P] Write failing Vitest tests for `appRoute` path detection and navigation helpers in `apps/web/tests/lib/appRoute.test.ts`
- [X] T006 [P] Write failing Vitest tests for `useCanManageTeam` in `apps/web/tests/hooks/useCanManageTeam.test.ts`
- [X] T007 [P] Write failing Vitest tests for `useRoles` in `apps/web/tests/api/roles.test.tsx`
- [X] T008 [P] Write failing Vitest tests for `useOrgMembers` and member mutation hooks in `apps/web/tests/api/users.test.tsx`
- [X] T009 [P] Write failing Vitest tests for `useInvitations` and `useCreateInvitation` in `apps/web/tests/api/invitations.test.tsx`

### Implementation for Foundational

- [X] T010 Add `VenueScopes` to `InvitationResponse` in `apps/api/DTOs/Invitations/InvitationDtos.cs`
- [X] T011 Project venue scopes in Send/List/Resend via `.Include()` in `apps/api/Services/InvitationService.cs`
- [X] T012 Run backend integration tests until T004 passes: `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~InvitationsControllerTests"`
- [X] T013 Regenerate OpenAPI and update `apps/web/src/types/generated-api.ts` with extended `InvitationResponse` (follow repo swagger → TS pipeline)
- [X] T014 [P] Implement `appRoute.ts` (paths `/`, `/venues/new`, `/settings`, `/settings/team`, placeholder routes, `/accept-invite` token parse) in `apps/web/src/lib/appRoute.ts`; re-export or migrate callers from `apps/web/src/lib/dashboardRoute.ts`
- [X] T015 [P] Implement `useCanManageTeam` hook in `apps/web/src/hooks/useCanManageTeam.ts`
- [X] T016 [P] Implement `formatVenueScopeSummary` helper in `apps/web/src/lib/teamScopeSummary.ts`
- [X] T017 [P] Implement `SettingsLayout` and `SettingsNav` (Team link gated by `canManageTeam`) in `apps/web/src/components/settings/SettingsLayout.tsx` and `apps/web/src/components/settings/SettingsNav.tsx`
- [X] T018 [P] Implement `SettingsLandingPage` and `PlaceholderSettingsPage` in `apps/web/src/pages/SettingsLandingPage.tsx` and `apps/web/src/pages/PlaceholderSettingsPage.tsx`
- [X] T019 Implement `useRoles` in `apps/web/src/api/roles.ts`
- [X] T020 Implement `useOrgMembers`, `useChangeMemberRole`, `useUpdateMemberVenueScopes`, and `useRemoveMember` in `apps/web/src/api/users.ts` (queries enabled only when `canManageTeam`)
- [X] T021 Implement `useInvitations`, `useCreateInvitation`, `useResendInvitation`, `useCancelInvitation`, and `acceptInvitation()` in `apps/web/src/api/invitations.ts`
- [X] T022 Wire authenticated route branches for Settings pages in `apps/web/src/App.tsx`; add **Settings** header link for all members in `apps/web/src/pages/DashboardHome.tsx`
- [X] T023 Run foundational frontend unit tests until T005–T009 pass: `cd apps/web && npm run test -- tests/lib/appRoute.test.ts tests/hooks/useCanManageTeam.test.ts tests/api/roles.test.tsx tests/api/users.test.tsx tests/api/invitations.test.tsx`

**Checkpoint**: Backend invitation scopes ready; generated types current; Settings shell routable; API hooks ready — user story phases can begin

---

## Phase 3: User Story 1 - Administrator invites a teammate (Priority: P1) 🎯 MVP

**Goal**: Admin opens Settings → Team, submits invite with email/role/optional venue scope; pending invitation appears in list

**Independent Test**: Sign in as admin → Settings → Team → invite with Venue Manager role scoped to one venue → pending row shows email, role, scope summary

### Tests for User Story 1 (REQUIRED) ⚠️

- [X] T024 [P] [US1] Write failing Vitest tests for `InviteMemberForm` validation and submit in `apps/web/tests/components/team/InviteMemberForm.test.tsx`
- [X] T025 [P] [US1] Write failing Vitest tests for Team page invite flow and pending list render in `apps/web/tests/pages/TeamSettingsPage.test.tsx`

### Implementation for User Story 1

- [X] T026 [US1] Implement `InviteMemberForm` (email, role select, venue multi-select, all-venues semantics) in `apps/web/src/components/team/InviteMemberForm.tsx`
- [X] T027 [US1] Implement `TeamSettingsPage` shell with invite form and `InvitationList` placeholder in `apps/web/src/pages/TeamSettingsPage.tsx`
- [X] T028 [US1] Wire `useCreateInvitation` success to refresh invitations list and show confirmation feedback in `apps/web/src/pages/TeamSettingsPage.tsx`
- [X] T029 [US1] Run US1 tests until T024–T025 pass: `cd apps/web && npm run test -- tests/components/team/InviteMemberForm.test.tsx tests/pages/TeamSettingsPage.test.tsx`

**Checkpoint**: User Story 1 fully functional — admins can invite teammates (MVP)

---

## Phase 4: User Story 2 - Administrator views and manages pending invitations (Priority: P2)

**Goal**: Pending invitations listed with status/expiry; re-send and cancel actions for non-accepted invites

**Independent Test**: Seed pending invitation → re-send renews expiry → cancel removes from active list; accepted rows have no actions

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T030 [P] [US2] Write failing Vitest tests for `InvitationList` resend/cancel and status-gated actions in `apps/web/tests/components/team/InvitationList.test.tsx`

### Implementation for User Story 2

- [X] T031 [US2] Implement `InvitationList` with resend/cancel controls in `apps/web/src/components/team/InvitationList.tsx`
- [X] T032 [US2] Integrate `InvitationList` into `TeamSettingsPage` with loading/error states in `apps/web/src/pages/TeamSettingsPage.tsx`
- [X] T033 [US2] Run US2 tests until T030 passes: `cd apps/web && npm run test -- tests/components/team/InvitationList.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Administrator manages existing members (Priority: P3)

**Goal**: Member list with edit modal (role + venue scopes) and removal confirmation dialog; last-admin protection surfaced

**Independent Test**: Edit member role/scopes via modal → list updates; remove non-admin after confirm; last-admin demotion/removal blocked

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T034 [P] [US3] Write failing Vitest tests for `MemberEditModal` save/cancel and last-admin error in `apps/web/tests/components/team/MemberEditModal.test.tsx`
- [X] T035 [P] [US3] Write failing Vitest tests for `RemoveMemberConfirm` confirm/cancel in `apps/web/tests/components/team/RemoveMemberConfirm.test.tsx`
- [X] T036 [P] [US3] Write failing Vitest tests for `MemberList` row actions in `apps/web/tests/components/team/MemberList.test.tsx`

### Implementation for User Story 3

- [X] T037 [US3] Implement `MemberList` with Edit/Remove actions in `apps/web/src/components/team/MemberList.tsx`
- [X] T038 [US3] Implement `MemberEditModal` (role select, venue multi-select, PATCH role + PUT scopes on save) in `apps/web/src/components/team/MemberEditModal.tsx`
- [X] T039 [US3] Implement `RemoveMemberConfirm` alertdialog in `apps/web/src/components/team/RemoveMemberConfirm.tsx`
- [X] T040 [US3] Integrate member list, edit modal, and remove confirm into `TeamSettingsPage` in `apps/web/src/pages/TeamSettingsPage.tsx`
- [X] T041 [US3] Run US3 tests until T034–T036 pass: `cd apps/web && npm run test -- tests/components/team/MemberEditModal.test.tsx tests/components/team/RemoveMemberConfirm.test.tsx tests/components/team/MemberList.test.tsx`

**Checkpoint**: User Stories 1–3 independently functional

---

## Phase 6: User Story 4 - Invited user accepts and joins the organization (Priority: P4)

**Goal**: `/accept-invite?token=` flow for new users (password + accept) and existing users (login + accept); invalid/expired token messaging

**Independent Test**: Open valid token link as new user → register password → accept → dashboard with correct role/scope; invalid token shows FR-014 message

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T042 [P] [US4] Write failing Vitest tests for `AcceptInvitePage` invalid token, password validation, and success navigation in `apps/web/tests/pages/AcceptInvitePage.test.tsx`
- [X] T043 [P] [US4] Write failing Vitest tests for `acceptInvitation` token bootstrap in `apps/web/tests/auth/authApi.accept.test.ts` (or extend existing auth API test file)

### Implementation for User Story 4

- [X] T044 [US4] Add `acceptInvitation` and token persistence helper in `apps/web/src/auth/authApi.ts`
- [X] T045 [US4] Add accept-invite session bootstrap helper in `apps/web/src/auth/AuthContext.tsx` (set tokens, load profile, phase `authenticated`)
- [X] T046 [US4] Implement `AcceptInvitePage` (new-user password, existing-user login, mismatch sign-out prompt) in `apps/web/src/pages/AcceptInvitePage.tsx`
- [X] T047 [US4] Wire `/accept-invite` route in unauthenticated and authenticated `App.tsx` branches in `apps/web/src/App.tsx`
- [X] T048 [US4] Run US4 tests until T042–T043 pass: `cd apps/web && npm run test -- tests/pages/AcceptInvitePage.test.tsx tests/auth/authApi.accept.test.ts`

**Checkpoint**: User Story 4 independently functional — invitees can join via link

---

## Phase 7: User Story 5 - Non-administrators cannot manage team membership (Priority: P5)

**Goal**: Settings visible to all org members; Team nav hidden; direct `/settings/team` redirect without member data; no management controls for non-admins

**Independent Test**: Sign in as Promoter → Settings shows placeholders without Team link → direct Team URL redirects to `/settings`

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T049 [P] [US5] Write failing Vitest tests for Settings landing Team link gating in `apps/web/tests/pages/SettingsLandingPage.test.tsx`
- [X] T050 [P] [US5] Write failing Vitest tests for Team page redirect when `!canManageTeam` in `apps/web/tests/pages/TeamSettingsPage.test.tsx`
- [X] T051 [P] [US5] Write failing Vitest tests for Settings header link visibility for all authenticated users in `apps/web/tests/pages/DashboardHome.test.tsx`

### Implementation for User Story 5

- [X] T052 [US5] Enforce Team page guard redirect to `/settings` without mounting member/invitation queries in `apps/web/src/pages/TeamSettingsPage.tsx`
- [X] T053 [US5] Hide Team nav item and block placeholder pages from exposing management affordances in `apps/web/src/components/settings/SettingsNav.tsx`
- [X] T054 [US5] Run US5 tests until T049–T051 pass: `cd apps/web && npm run test -- tests/pages/SettingsLandingPage.test.tsx tests/pages/TeamSettingsPage.test.tsx tests/pages/DashboardHome.test.tsx`

**Checkpoint**: All five user stories independently functional; permission model verified

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Styles, E2E path, coverage gate, quickstart validation

- [X] T055 [P] Add Settings hub, Team page, and modal styles in `apps/web/src/index.css`
- [ ] T056 [P] Add optional Playwright spec for admin invite → accept → dashboard in `tests/e2e/specs/team/invitation-flow.spec.ts`
- [X] T057 Verify ≥80.0% line/branch coverage: `dotnet test apps/api.tests/split-rail-api.tests.csproj` (coverlet → cobertura) and `cd apps/web && npm run test:coverage` (Vitest → lcov); missing or unparseable reports FAIL
- [ ] T058 Run manual scenarios A–F from `specs/016-team-invitation-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–7)**: Depend on Foundational; implement in priority order P1 → P5 (or parallel after Phase 2 if staffed)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on other stories (MVP)
- **User Story 2 (P2)**: After Foundational — extends US1 Team page; independently testable via invitation list actions
- **User Story 3 (P3)**: After Foundational — extends US1 Team page; independently testable via member list/modal
- **User Story 4 (P4)**: After Foundational — independent accept route; no Team page dependency
- **User Story 5 (P5)**: After Foundational — hardens gating across Settings shell; testable without US1–US4 complete but best validated after Team page exists

### Within Each User Story

- Tests written first and fail before implementation
- Components before page integration
- Story checkpoint before next priority

### Parallel Opportunities

- T002, T003 (Setup)
- T004–T009 (Foundational tests — different files)
- T014–T018 (Foundational frontend modules — different files)
- T024, T025 (US1 tests)
- T034–T036 (US3 tests)
- T042, T043 (US4 tests)
- T049–T051 (US5 tests)
- T055, T056 (Polish — different files)

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
# T024 InviteMemberForm.test.tsx
# T025 TeamSettingsPage.test.tsx

# Then sequentially:
# T026 InviteMemberForm.tsx → T027–T028 TeamSettingsPage integration
```

---

## Parallel Example: Foundational

```bash
# Backend track (sequential):
# T004 tests → T010–T011 impl → T012 verify → T013 regen types

# Frontend track (parallel after T013):
# T014 appRoute.ts
# T015 useCanManageTeam.ts
# T016 teamScopeSummary.ts
# T017 SettingsLayout + SettingsNav
# T018 Settings landing + placeholder pages
# then T019–T021 API hooks → T022 App wiring → T023 verify
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Admin can invite teammate; pending invitation visible
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → API, routing, Settings shell ready
2. US1 → invite flow (MVP)
3. US2 → invitation management
4. US3 → member edit/remove
5. US4 → accept-invite public flow
6. US5 → permission hardening
7. Polish → coverage + E2E + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 + US2 (Team page invite + invitations)
   - Developer B: US3 (member modal + removal)
   - Developer C: US4 (accept-invite flow)
   - Developer D: US5 (permission gating tests)
3. Merge at Polish phase for coverage gate

---

## Notes

- Map spec "team-management permission" to `canManagePermissions` via `useCanManageTeam()`
- Empty/missing `venueIds` on invite → organization-wide venue access (backend contract)
- Member edit modal saves PATCH role then PUT venue-scopes (two calls when both changed)
- Accept link format: `{APP_ORIGIN}/accept-invite?token={rawToken}`
- Do not mount `useOrgMembers` / `useInvitations` when `!canManageTeam` (defense in depth; GET /api/users is open server-side)
- Reuse `WelcomeModal` backdrop/focus-trap patterns for modals; `EventDeleteConfirm` pattern for removal confirm
- Commit after each task or logical group; stop at any checkpoint to validate story independently
