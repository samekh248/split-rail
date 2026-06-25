---
description: "Task list for Branded Authentication Layout Theming (SPLR-92, M5)"
---

# Tasks: Branded Authentication Layout Theming

**Input**: Design documents from `/specs/069-theme-auth-layout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation where gaps exist). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US5) aligned with SPLR-92 acceptance criteria. Frontend-only (`apps/web`). Verify-first strategy per `research.md` — most auth CSS is already tokenized; net-new work is test hardening, RegisterPage logo parity, and CSS audit. Welcome modal theming (SPLR-93) is **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US5)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependencies, and contract baseline before auth theming work.

- [x] T001 Verify on branch `069-theme-auth-layout` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/069-theme-auth-layout/contracts/auth-layout-theming.md` against current auth block in `apps/web/src/index.css` (lines ~1439–1652) and note gaps per `research.md` verify-first findings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm M1/M4 design-token and button dependencies; record baseline auth test state. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts` in `apps/web` and confirm M1 tokens pass — hard dependency on `059-mhc-design-tokens` (SPLR-79)
- [x] T004 [P] Run `npm test -- tests/theme/buttons.test.tsx tests/theme/buttonMigration.test.ts` in `apps/web` and confirm auth surfaces (`LoginForm.tsx`, `RegisterForm.tsx`, `OrganizationCreateStep.tsx`) declare `btn-primary` — hard dependency on `065-shared-button-styles` (SPLR-88)
- [x] T005 [P] Run baseline `npm test -- tests/auth/AuthLayout.test.tsx tests/auth/AuthLayout.theme.test.tsx tests/auth/LoginPage.test.tsx tests/auth/RegisterPage.test.tsx tests/onboarding/OrganizationCreateStep.theme.test.tsx` in `apps/web` and record current pass/fail state

**Checkpoint**: Token and button foundations verified; auth test baseline recorded.

---

## Phase 3: User Story 1 — Branded Sign-In Experience (Priority: P1) 🎯 MVP

**Goal**: Sign-in screen presents Montana High Country palette — cream page, white card, brown title, orange links, shared primary submit, on-brand focus states (FR-001–FR-008, US1 acceptance scenarios).

**Independent Test**: Render sign-in at mobile/desktop widths; confirm `main.auth-layout`, white card, brown title, orange footer link, and `btn-primary` submit — run `apps/web/tests/auth/LoginPage.test.tsx` and `LoginForm.test.tsx`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation if assertions expose gaps**

- [x] T006 [P] [US1] Add failing auth-layout structure, wordmark, and `btn-primary` submit assertions in `apps/web/tests/auth/LoginPage.test.tsx` per `specs/069-theme-auth-layout/contracts/auth-layout-theming.md`
- [x] T007 [P] [US1] Add failing `btn-primary` class assertion on submit button in `apps/web/tests/auth/LoginForm.test.tsx`
- [x] T008 [P] [US1] Extend failing branded structure assertions (`auth-layout`, `auth-layout__card`, `auth-layout__title`, `showLogo` wordmark) in `apps/web/tests/auth/AuthLayout.test.tsx`

### Implementation for User Story 1

- [x] T009 [US1] Audit and fix auth CSS rules in `apps/web/src/index.css` (`.auth-layout`, `.auth-layout__card`, `.auth-layout__title`, `.auth-layout__link`, `.form-field__input`, `.auth-resolving`) until T006–T008 pass — token-only colors, no legacy blue hex
- [x] T010 [US1] Verify `apps/web/src/pages/LoginPage.tsx` passes `showLogo` to `AuthLayout` and footer link uses `auth-layout__link` class without inline color overrides

**Checkpoint**: Branded sign-in deliverable complete; MVP for SPLR-92.

---

## Phase 4: User Story 2 — Registration Matches Brand Language (Priority: P1)

**Goal**: Registration screen reuses same branded auth layout as sign-in — matching card, typography, field focus/error tokens, and primary submit (US2 acceptance scenarios).

**Independent Test**: Render registration screen; confirm auth layout shell and `btn-primary` submit match sign-in patterns — run `apps/web/tests/auth/RegisterPage.test.tsx` and `RegisterForm.test.tsx`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T011 [P] [US2] Add failing auth-layout structure and `btn-primary` submit assertions in `apps/web/tests/auth/RegisterPage.test.tsx` per contract
- [x] T012 [P] [US2] Add failing `btn-primary` class assertion on submit button in `apps/web/tests/auth/RegisterForm.test.tsx`

### Implementation for User Story 2

- [x] T013 [US2] Verify `apps/web/src/pages/RegisterPage.tsx` footer navigation uses `auth-layout__nav` and `auth-layout__link` classes with no legacy blue inline styles; fix `apps/web/src/index.css` auth form/error rules if T011–T012 expose gaps

**Checkpoint**: Registration visually consistent with sign-in; both P1 stories complete.

---

## Phase 5: User Story 3 — Organization Creation Auth Journey (Priority: P2)

**Goal**: Organization-creation step uses same branded auth card shell and shared primary submit without behavior changes (US3 acceptance scenarios).

**Independent Test**: Render `OrganizationCreateStep` in isolation; confirm `.auth-layout`, brown title, and `btn-primary` submit — run `apps/web/tests/onboarding/OrganizationCreateStep.theme.test.tsx`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T014 [P] [US3] Extend failing branded title class (`.auth-layout__title`) and auth card structure assertions in `apps/web/tests/onboarding/OrganizationCreateStep.theme.test.tsx` per contract

### Implementation for User Story 3

- [x] T015 [US3] Verify `apps/web/src/components/onboarding/OrganizationCreateStep.tsx` uses `AuthLayout` and `btn-primary` submit with unchanged validation, loading, and error behavior; fix CSS in `apps/web/src/index.css` only if T014 fails

**Checkpoint**: Organization-creation step matches auth shell branding.

---

## Phase 6: User Story 4 — Brand Logo on Entry Screens (Priority: P3)

**Goal**: Split-Rail wordmark centered above card title on sign-in and registration entry screens (FR-009, US4 acceptance scenarios).

**Independent Test**: Sign-in shows wordmark (existing); registration shows wordmark after parity change — run updated `RegisterPage.test.tsx` and `AuthLayout.test.tsx`.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T016 [P] [US4] Add failing wordmark (`role="img"`) assertion to `apps/web/tests/auth/RegisterPage.test.tsx` before `showLogo` is enabled on registration

### Implementation for User Story 4

- [x] T017 [US4] Add `showLogo` prop to `AuthLayout` in `apps/web/src/pages/RegisterPage.tsx` for parity with `apps/web/src/pages/LoginPage.tsx`
- [x] T018 [US4] Verify logo spacing hooks in `apps/web/src/index.css` (`.auth-layout__logo`, `.brand-logo--auth`) render wordmark centered above title without crowding form fields at mobile and desktop widths

**Checkpoint**: Both entry screens display optional centered wordmark.

---

## Phase 7: User Story 5 — Regression-Safe Auth Theming Verification (Priority: P2)

**Goal**: Dedicated CSS contract tests and consolidated component tests prevent silent auth theming regressions (FR-011, SC-004, US5 acceptance scenarios).

**Independent Test**: Run `apps/web/tests/theme/authLayoutTheming.test.ts` and full auth test suite — all branded structure and token assertions pass.

### Tests for User Story 5 (REQUIRED) ⚠️

- [x] T019 [P] [US5] Create failing CSS contract assertions in `apps/web/tests/theme/authLayoutTheming.test.ts` per `specs/069-theme-auth-layout/contracts/auth-layout-theming.md` (cream page bg, white card, brown title font/color, orange links, no `#2563eb`, cream resolving bg)
- [x] T020 [US5] Merge duplicate structure assertions from `apps/web/tests/auth/AuthLayout.theme.test.tsx` into `apps/web/tests/auth/AuthLayout.test.tsx` and remove or slim redundant cases in `AuthLayout.theme.test.tsx`

### Implementation for User Story 5

- [x] T021 [US5] Complete denylist hex audit of auth CSS block in `apps/web/src/index.css` (`.auth-layout` through `.auth-resolving`, `.form-field__*`, `.session-expired-notice`) — replace any legacy hex with design tokens until T019 passes

**Checkpoint**: Automated regression suite covers auth layout CSS contract and component class hooks.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, and quickstart validation.

- [x] T022 Run `npm test -- tests/auth tests/theme/authLayoutTheming.test.ts tests/onboarding/OrganizationCreateStep.theme.test.tsx tests/theme/buttonMigration.test.ts tests/theme/dataContainers.test.ts` in `apps/web` and resolve failures
- [x] T023 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T024 Verify ≥80.0% line/branch coverage for modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T025 Execute manual validation checklist in `specs/069-theme-auth-layout/quickstart.md` (sign-in, registration, org creation at 375px and 1280px; focus rings; no legacy blue)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–7)**: All depend on Foundational completion
  - US1 + US2 (both P1) can proceed in parallel after Phase 2
  - US3, US4, US5 can proceed after Foundational; US4 depends on US2 RegisterPage tests being in place
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 Sign-in | P1 | Foundational | MVP — no other story required |
| US2 Registration | P1 | Foundational | Shares CSS with US1; parallel-safe |
| US3 Org creation | P2 | Foundational | Verify-only; parallel-safe |
| US4 Logo parity | P3 | US2 RegisterPage tests (T011) | Adds `showLogo` to registration |
| US5 Regression tests | P2 | Foundational | CSS contract can start after T002 review |

### Within Each User Story

- Tests MUST be written and FAIL before implementation (where gaps exist)
- CSS fixes in `index.css` apply to all stories — coordinate if multiple stories touch same selectors
- Functional auth behavior MUST NOT change (FR-010)

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001 after branch checkout
- **Phase 2**: T004 and T005 parallel after T003
- **Phase 3**: T006, T007, T008 all parallel
- **Phase 4**: T011 and T012 parallel
- **Phases 3 + 4 + 5**: Can run in parallel across developers once Foundational completes
- **Phase 7**: T019 parallel with T020

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (different files):
Task T006: Add LoginPage theme assertions in apps/web/tests/auth/LoginPage.test.tsx
Task T007: Add LoginForm btn-primary assertion in apps/web/tests/auth/LoginForm.test.tsx
Task T008: Extend AuthLayout structure tests in apps/web/tests/auth/AuthLayout.test.tsx

# Then sequential CSS fix:
Task T009: Audit/fix apps/web/src/index.css auth block until tests pass
```

---

## Parallel Example: User Stories 1 + 2

```bash
# After Foundational checkpoint, two developers:
Developer A: Phase 3 (US1 sign-in tests + CSS fixes)
Developer B: Phase 4 (US2 registration tests + RegisterPage verify)

# Both share index.css — merge CSS changes carefully or assign T009/T013 to one owner
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (branded sign-in)
4. **STOP and VALIDATE**: Run LoginPage, LoginForm, AuthLayout tests; manual sign-in check per quickstart.md
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → dependencies verified
2. US1 Sign-in → MVP branded entry point
3. US2 Registration → acquisition path matches sign-in
4. US3 Org creation → edge-case onboarding continuity
5. US4 Logo → registration wordmark parity
6. US5 Regression → CSS contract + test consolidation
7. Polish → coverage gate + quickstart

### Suggested MVP Scope

**User Story 1 only** (Phase 3) delivers the primary brand touchpoint — branded sign-in with cream/white/brown/orange palette and shared primary submit. Minimum task set: T001–T010.

---

## Notes

- Verify-first: many T006–T021 tasks may pass immediately if auth CSS is already tokenized; still execute tests to document contract compliance
- `AcceptInvitePage.tsx` inherits auth styling via shared CSS — spot-check in T025 manual validation only
- Do not modify auth API orchestration, validation rules, or routing (FR-010)
- Welcome modal theming (SPLR-93) is explicitly out of scope
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T002 | — |
| Foundational | T003–T005 | — |
| US1 Sign-in (P1) | T006–T010 | US1 |
| US2 Registration (P1) | T011–T013 | US2 |
| US3 Org creation (P2) | T014–T015 | US3 |
| US4 Logo (P3) | T016–T018 | US4 |
| US5 Regression (P2) | T019–T021 | US5 |
| Polish | T022–T025 | — |
| **Total** | **25 tasks** | |

**Parallel opportunities**: 12 tasks marked [P]

**Independent test criteria**:

| Story | How to verify independently |
|-------|----------------------------|
| US1 | `npm test -- tests/auth/LoginPage.test.tsx tests/auth/LoginForm.test.tsx tests/auth/AuthLayout.test.tsx` |
| US2 | `npm test -- tests/auth/RegisterPage.test.tsx tests/auth/RegisterForm.test.tsx` |
| US3 | `npm test -- tests/onboarding/OrganizationCreateStep.theme.test.tsx` |
| US4 | Wordmark visible on registration in `RegisterPage.test.tsx` |
| US5 | `npm test -- tests/theme/authLayoutTheming.test.ts tests/auth/AuthLayout.test.tsx` |
