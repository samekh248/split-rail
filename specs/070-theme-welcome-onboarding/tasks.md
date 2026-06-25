---
description: "Task list for Welcome Modal and Onboarding Flow Theming (SPLR-93, M5)"
---

# Tasks: Welcome Modal and Onboarding Flow Theming

**Input**: Design documents from `/specs/070-theme-welcome-onboarding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation where gaps exist). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US4) aligned with SPLR-93 acceptance criteria. Frontend-only (`apps/web`). Verify-first strategy per `research.md` — most welcome-modal CSS is already tokenized; net-new work is test hardening, CSS contract module, and WelcomeModal test consolidation. Organization creation inherits branded `AuthLayout` from SPLR-92 (`069-theme-auth-layout`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US4)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependencies, and contract baseline before onboarding theming work.

- [x] T001 Verify on branch `070-theme-welcome-onboarding` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/070-theme-welcome-onboarding/contracts/onboarding-theming.md` against current welcome-modal block in `apps/web/src/index.css` (lines ~1699–1740) and `.auth-resolving` rules; note gaps per `research.md` verify-first findings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm M1/M4/M5 design-token, button, and auth-layout dependencies; record baseline onboarding test state. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts` in `apps/web` and confirm M1 tokens pass — hard dependency on `059-mhc-design-tokens` (SPLR-79)
- [x] T004 [P] Run `npm test -- tests/theme/buttons.test.tsx tests/theme/buttonMigration.test.ts` in `apps/web` and confirm onboarding surfaces (`WelcomeModal.tsx`, `OrganizationCreateStep.tsx`) declare `btn-primary` — hard dependency on `065-shared-button-styles` (SPLR-88)
- [x] T005 [P] Run `npm test -- tests/theme/authLayoutTheming.test.ts` in `apps/web` and confirm SPLR-92 auth layout contract passes — hard dependency on `069-theme-auth-layout` (SPLR-92)
- [x] T006 [P] Run baseline `npm test -- tests/onboarding/WelcomeModal.test.tsx tests/onboarding/WelcomeModal.theme.test.tsx tests/onboarding/OrganizationCreateStep.theme.test.tsx` in `apps/web` and record current pass/fail state

**Checkpoint**: Token, button, and auth-layout foundations verified; onboarding test baseline recorded.

---

## Phase 3: User Story 1 — Branded Welcome Overlay (Priority: P1) 🎯 MVP

**Goal**: Post-onboarding welcome overlay presents Montana High Country palette — brown-tinted scrim, white dialog, slab-serif brown title, muted body copy, shared primary dismiss; focus trap and dismiss behavior unchanged (FR-001–FR-005, US1 acceptance scenarios).

**Independent Test**: Render `WelcomeModal` with organization name; confirm `.welcome-modal__backdrop`, white panel, `.welcome-modal__title`, `btn-primary` dismiss, Escape dismissal — run `apps/web/tests/onboarding/WelcomeModal.test.tsx`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation if assertions expose gaps**

- [x] T007 [P] [US1] Add failing branded structure assertions (`.welcome-modal__backdrop`, `.welcome-modal`, `.welcome-modal__title`, `.welcome-modal__dismiss`, `btn-primary`) in `apps/web/tests/onboarding/WelcomeModal.test.tsx` per `specs/070-theme-welcome-onboarding/contracts/onboarding-theming.md`
- [x] T008 [P] [US1] Add failing functional assertions for dialog `role`/`aria-modal`, Escape dismiss, and button dismiss in `apps/web/tests/onboarding/WelcomeModal.test.tsx` — must pass after theming (FR-005 freeze)

### Implementation for User Story 1

- [x] T009 [US1] Audit and fix welcome-modal CSS rules in `apps/web/src/index.css` (`.welcome-modal__backdrop` through `.welcome-modal__dismiss`) until T007 passes — token-only colors, documented `rgba(62, 39, 35, 0.5)` scrim, no legacy blue hex
- [x] T010 [US1] Verify `apps/web/src/components/onboarding/WelcomeModal.tsx` retains class hooks (`welcome-modal`, `welcome-modal__title`, `welcome-modal__body`, `welcome-modal__dismiss btn-primary`), focus trap, and dismiss handlers without behavioral changes

**Checkpoint**: Branded welcome overlay deliverable complete; MVP for SPLR-93.

---

## Phase 4: User Story 2 — Organization Creation Matches Auth Brand (Priority: P1)

**Goal**: Organization-creation step inherits branded authentication layout from SPLR-92 — cream page, white card, brown title, on-brand form fields, shared primary submit (FR-006–FR-007, US2 acceptance scenarios).

**Independent Test**: Render `OrganizationCreateStep` in isolation; confirm `.auth-layout`, `.auth-layout__card`, `.auth-layout__title`, and `btn-primary` submit — run `apps/web/tests/onboarding/OrganizationCreateStep.theme.test.tsx`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T011 [P] [US2] Extend failing branded auth-layout structure and `btn-primary` submit assertions in `apps/web/tests/onboarding/OrganizationCreateStep.theme.test.tsx` per `specs/070-theme-welcome-onboarding/contracts/onboarding-theming.md`

### Implementation for User Story 2

- [x] T012 [US2] Verify `apps/web/src/components/onboarding/OrganizationCreateStep.tsx` uses `AuthLayout` and `btn-primary` submit with unchanged validation, loading, and error behavior; fix `apps/web/src/index.css` auth form rules only if T011 fails due to SPLR-92 regression

**Checkpoint**: Organization-creation step visually continuous with branded sign-in/registration.

---

## Phase 5: User Story 3 — Auth Resolving State On-Brand (Priority: P2)

**Goal**: Authentication-resolving loading state uses Canvas Cream background and warm muted status text with no flash of unbranded styling (FR-008, US3 acceptance scenarios).

**Independent Test**: Assert `.auth-resolving` CSS contract — cream background and muted text — run `apps/web/tests/theme/onboardingTheming.test.ts` (resolving assertions) and `apps/web/tests/theme/authLayoutTheming.test.ts`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T013 [P] [US3] Add failing `.auth-resolving` muted-text assertion (`color: var(--color-text-muted)`) in `apps/web/tests/theme/onboardingTheming.test.ts` per contract (cream bg may already pass via `authLayoutTheming.test.ts`)

### Implementation for User Story 3

- [x] T014 [US3] Verify `apps/web/src/App.tsx` auth-resolving markup (`className="auth-resolving"`, `role="status"`, `aria-live="polite"`) and fix `apps/web/src/index.css` `.auth-resolving` rules until T013 passes

**Checkpoint**: Cold-load resolving state matches Montana High Country palette.

---

## Phase 6: User Story 4 — Regression-Safe Onboarding Theming Verification (Priority: P2)

**Goal**: Dedicated CSS contract tests and consolidated component tests prevent silent onboarding theming regressions (FR-010, SC-004, US4 acceptance scenarios).

**Independent Test**: Run `apps/web/tests/theme/onboardingTheming.test.ts` and full onboarding test suite — all branded structure and token assertions pass.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T015 [P] [US4] Create failing CSS contract assertions in `apps/web/tests/theme/onboardingTheming.test.ts` per `specs/070-theme-welcome-onboarding/contracts/onboarding-theming.md` (brown scrim backdrop, white modal surface/border/shadow, brown title font/color, muted body, no `#2563eb` in welcome-modal block)
- [x] T016 [US4] Merge duplicate branded-structure assertions from `apps/web/tests/onboarding/WelcomeModal.theme.test.tsx` into `apps/web/tests/onboarding/WelcomeModal.test.tsx` and remove or slim redundant cases in `WelcomeModal.theme.test.tsx`

### Implementation for User Story 4

- [x] T017 [US4] Complete denylist hex audit of welcome-modal CSS block in `apps/web/src/index.css` (`.welcome-modal__backdrop` through `.welcome-modal__dismiss`) — replace any legacy hex with design tokens until T015 passes

**Checkpoint**: Automated regression suite covers onboarding CSS contract and component class hooks.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, and quickstart validation.

- [x] T018 Run `npm test -- tests/onboarding tests/theme/onboardingTheming.test.ts tests/theme/authLayoutTheming.test.ts tests/theme/buttonMigration.test.ts tests/theme/dataContainers.test.ts` in `apps/web` and resolve failures
- [x] T019 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T020 Verify ≥80.0% line/branch coverage for modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T021 Execute manual validation checklist in `specs/070-theme-welcome-onboarding/quickstart.md` (welcome overlay, org creation, auth resolving at 375px and 1280px; focus rings; team modal backdrop spot-check)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational completion
  - US1 + US2 (both P1) can proceed in parallel after Phase 2
  - US3 depends on T015 file existing for shared `onboardingTheming.test.ts` — start T013 after T015 scaffold or add resolving assertions in same file during US4
  - US4 CSS contract (T015) can start in parallel with US1/US2 after Foundational
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 Welcome overlay | P1 | Foundational | MVP — no other story required |
| US2 Org creation | P1 | Foundational + SPLR-92 | Verify-only; parallel-safe with US1 |
| US3 Auth resolving | P2 | Foundational | Shares `onboardingTheming.test.ts` with US4 |
| US4 Regression tests | P2 | Foundational | CSS contract + WelcomeModal test consolidation |

### Within Each User Story

- Tests MUST be written and FAIL before implementation (where gaps exist)
- CSS fixes in `index.css` welcome-modal block apply to team modals reusing `.welcome-modal__*` — coordinate changes
- Functional onboarding behavior MUST NOT change (FR-009)

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001 after branch checkout
- **Phase 2**: T004, T005, T006 parallel after T003
- **Phase 3**: T007 and T008 parallel
- **Phases 3 + 4**: Can run in parallel across developers once Foundational completes
- **Phase 6**: T015 parallel with T016; T017 after T015

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (same file, sequential edits or pair):
Task T007: Add branded structure assertions in apps/web/tests/onboarding/WelcomeModal.test.tsx
Task T008: Add functional dismiss/a11y assertions in apps/web/tests/onboarding/WelcomeModal.test.tsx

# Then sequential CSS fix:
Task T009: Audit/fix apps/web/src/index.css welcome-modal block until tests pass
Task T010: Verify apps/web/src/components/onboarding/WelcomeModal.tsx unchanged behavior
```

---

## Parallel Example: User Stories 1 + 2

```bash
# After Foundational checkpoint, two developers:
Developer A: Phase 3 (US1 welcome modal tests + CSS fixes)
Developer B: Phase 4 (US2 org-create verify + theme test extensions)

# US2 has no welcome-modal CSS overlap — safe parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (branded welcome overlay)
4. **STOP and VALIDATE**: Run `WelcomeModal.test.tsx`; manual welcome overlay check per quickstart.md
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → dependencies verified
2. US1 Welcome overlay → MVP post-registration brand touchpoint
3. US2 Org creation → incomplete-onboarding path matches auth screens
4. US3 Auth resolving → cold-load brand continuity
5. US4 Regression → CSS contract + test consolidation
6. Polish → coverage gate + quickstart

### Suggested MVP Scope

**User Story 1 only** (Phase 3) delivers the primary post-auth brand moment — branded welcome overlay with brown scrim, white card, brand title, and shared primary dismiss. Minimum task set: T001–T010.

---

## Notes

- Verify-first: many T007–T017 tasks may pass immediately if welcome-modal CSS is already tokenized; still execute tests to document contract compliance
- `MemberEditModal.tsx` and `RemoveMemberConfirm.tsx` inherit backdrop/card styles via shared `.welcome-modal__*` classes — spot-check in T021 manual validation only
- Do not modify onboarding API orchestration, welcome show/hide rules, focus trap logic, or routing (FR-009)
- WCAG contrast token adjustments (SPLR-94) are explicitly out of scope
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T002 | — |
| Foundational | T003–T006 | — |
| US1 Welcome overlay (P1) | T007–T010 | US1 |
| US2 Org creation (P1) | T011–T012 | US2 |
| US3 Auth resolving (P2) | T013–T014 | US3 |
| US4 Regression (P2) | T015–T017 | US4 |
| Polish | T018–T021 | — |
| **Total** | **21 tasks** | |

**Parallel opportunities**: 10 tasks marked [P]

**Independent test criteria**:

| Story | How to verify independently |
|-------|----------------------------|
| US1 | `npm test -- tests/onboarding/WelcomeModal.test.tsx` |
| US2 | `npm test -- tests/onboarding/OrganizationCreateStep.theme.test.tsx` |
| US3 | `npm test -- tests/theme/onboardingTheming.test.ts` (resolving assertions) |
| US4 | `npm test -- tests/theme/onboardingTheming.test.ts tests/onboarding/WelcomeModal.test.tsx` |
