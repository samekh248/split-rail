---
description: "Task list for Shared Primary and Secondary Button Styles (SPLR-88, M4)"
---

# Tasks: Shared Primary and Secondary Button Styles

**Input**: Design documents from `/specs/065-shared-button-styles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-88 acceptance criteria. Frontend-only (`apps/web`). Destructive buttons, auth layout chrome (SPLR-92), onboarding layout (SPLR-93), and full legacy hex migration (SPLR-91) are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependencies, and contract baseline before button work.

- [x] T001 Verify on branch `065-shared-button-styles` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/065-shared-button-styles/contracts/shared-button-styles.md` against current shared button block in `apps/web/src/index.css` (note finalize settlement gap and `.btn-secondary` light-surface mismatch per `research.md` D4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm M1 design tokens are present and baseline theme tests run. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts` in `apps/web` and confirm M1 tokens (`--color-accent-orange`, `--radius-button`, `--color-border-subtle`) pass — hard dependency on `059-mhc-design-tokens`
- [x] T004 [P] Run baseline `npm test -- tests/theme/buttons.test.tsx tests/theme/legacyPalette.test.ts` in `apps/web` and record current pass/fail state before extending assertions

**Checkpoint**: Token foundation verified; baseline tests recorded.

---

## Phase 3: User Story 1 — Recognizable Primary Actions (Priority: P1) 🎯 MVP

**Goal**: Shared `.btn-primary` and `.btn-primary--compact` styles with accent fill, white label, bold sans-serif, radius, and hover/disabled/focus-visible states (FR-001, FR-003).

**Independent Test**: Inspect `apps/web/src/index.css` — `.btn-primary` uses `var(--color-accent-orange)` background and `var(--color-surface-white)` label; interaction states use token references; no `#1e293b` in primary rules.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Extend failing hover/disabled/focus-visible token assertions for `.btn-primary` in `apps/web/tests/theme/buttons.test.tsx` per `specs/065-shared-button-styles/contracts/shared-button-styles.md`
- [x] T006 [P] [US1] Add failing `.btn-primary--compact` accent token assertions in `apps/web/tests/theme/buttons.test.tsx`

### Implementation for User Story 1

- [x] T007 [US1] Verify and refine `.btn-primary` and `.btn-primary--compact` base rules in `apps/web/src/index.css` per contract (padding, font-size, token-only colors)
- [x] T008 [US1] Verify grouped `:hover:not(:disabled)`, `:disabled`, and `:focus-visible` selectors for primary variants in `apps/web/src/index.css` use `var(--color-accent-orange-hover)`, `opacity: 0.6`, and `var(--color-focus-ring)`
- [x] T009 [US1] Strip duplicate color/disabled declarations from `.auth-form__submit` block in `apps/web/src/index.css` — retain layout-only rules (margin, width, flex)

**Checkpoint**: Primary button CSS contract satisfied and test-verified; MVP deliverable for SPLR-88 primary styling.

---

## Phase 4: User Story 2 — Clearly Distinct Secondary Actions (Priority: P2)

**Goal**: Light-surface `.btn-secondary` (brown label/border) and dark-chrome `.btn-secondary--on-dark` (cream label/border) with shared interaction states (FR-002, FR-003).

**Independent Test**: Side-by-side primary and secondary on cream/white — secondary uses brown border/text, not orange fill; dark nav secondary uses cream tones.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T010 [P] [US2] Replace failing `.btn-secondary` transparent-only assertion with brown label (`var(--color-primary-brown)`) and token border checks in `apps/web/tests/theme/buttons.test.tsx`
- [x] T011 [P] [US2] Add failing `.btn-secondary--on-dark` cream label/border assertions in `apps/web/tests/theme/buttons.test.tsx`
- [x] T012 [P] [US2] Add failing secondary hover/disabled/focus-visible state assertions in `apps/web/tests/theme/buttons.test.tsx`

### Implementation for User Story 2

- [x] T013 [US2] Refactor `.btn-secondary` in `apps/web/src/index.css` for light-surface brown label/border per `specs/065-shared-button-styles/contracts/shared-button-styles.md`
- [x] T014 [US2] Extract prior dark-surface cream secondary rules into `.btn-secondary--on-dark` in `apps/web/src/index.css`
- [x] T015 [US2] Merge `.btn-outline` selector list with `.btn-secondary` for light-surface cancel/outline actions in `apps/web/src/index.css` (avoid duplicate rule drift)
- [x] T016 [US2] Ensure `.auth-form__secondary` in `apps/web/src/index.css` uses shared secondary styling (brown on light) via merged selectors; remove redundant per-component color overrides

**Checkpoint**: Secondary variants distinct from primary; light and dark surface contexts covered.

---

## Phase 5: User Story 3 — High-Traffic Surfaces Migrated (Priority: P3)

**Goal**: All FR-005 surfaces adopt explicit `btn-primary` or `btn-primary--compact` classes; Finalize Settlement themed; behavior unchanged (FR-005, FR-006, FR-007).

**Independent Test**: Run migration tests — each FR-005 control has shared class; `legacyPalette.test.ts` passes; existing behavioral tests unchanged.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T017 [P] [US3] Create failing FR-005 migration assertions in `apps/web/tests/theme/buttonMigration.test.ts` per contract migration matrix
- [x] T018 [P] [US3] Add failing `btn-primary` class assertion on `[data-testid="finalize-settlement-btn"]` in `apps/web/tests/settlement/FinalizeSettlementPanel.test.tsx`
- [x] T019 [P] [US3] Add failing `btn-primary--compact` assertions in `apps/web/tests/components/qbo/SyncAllButton.test.tsx` and `apps/web/tests/qbo/SyncNowButton.test.tsx`
- [x] T020 [P] [US3] Add failing `btn-primary` assertion on `.dashboard-empty__retry` in `apps/web/tests/pages/DashboardOverviewPage.test.tsx`

### Implementation for User Story 3

- [x] T021 [P] [US3] Add `btn-primary` class to finalize button in `apps/web/src/components/settlement/FinalizeSettlementPanel.tsx`
- [x] T022 [P] [US3] Add `btn-primary--compact` to sync button in `apps/web/src/components/qbo/SyncNowButton.tsx`
- [x] T023 [P] [US3] Add `btn-primary--compact` to sync button in `apps/web/src/components/qbo/SyncAllButton.tsx`
- [x] T024 [P] [US3] Add `btn-primary` to retry buttons in `apps/web/src/pages/DashboardOverviewPage.tsx`, `apps/web/src/pages/AccountingOverviewPage.tsx`, and `apps/web/src/pages/EventWorkspacePage.tsx`
- [x] T025 [US3] Verify/add `btn-primary--compact` on lock button in `apps/web/src/components/ledger/LedgerGrid.tsx` per contract matrix
- [x] T026 [US3] Verify `btn-primary` present on auth/onboarding submit buttons in `apps/web/src/components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `OrganizationCreateStep.tsx`, and `WelcomeModal.tsx`; fix any missing classes
- [x] T027 [US3] Remove redundant primary color overrides from migrated BEM blocks in `apps/web/src/index.css` (e.g., `.dashboard-empty__retry`, `.welcome-modal__dismiss`) — layout-only rules remain

**Checkpoint**: All FR-005 surfaces migrated; explicit classes enable regression tests.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, and quickstart validation.

- [x] T028 Run `npm test -- tests/theme/buttons.test.tsx tests/theme/buttonMigration.test.ts tests/theme/legacyPalette.test.ts tests/settlement/FinalizeSettlementPanel.test.tsx tests/components/qbo/SyncNowButton.test.tsx tests/components/qbo/SyncAllButton.test.tsx tests/pages/DashboardOverviewPage.test.tsx tests/onboarding/WelcomeModal.theme.test.tsx tests/onboarding/OrganizationCreateStep.theme.test.tsx` in `apps/web` and resolve failures
- [x] T029 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T030 Verify ≥80.0% line/branch coverage for modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T031 Execute SPLR-88 validation checklist in `specs/065-shared-button-styles/quickstart.md` (automated grep + manual primary/secondary audit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–5)**: Depend on Foundational completion; recommended order P1 → P2 → P3 (US2 can start after US1 CSS block exists; US3 depends on US1 primary classes)
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on US2/US3
- **User Story 2 (P2)**: Can start after Foundational — independent of US3; benefits from US1 primary existing for side-by-side contrast validation
- **User Story 3 (P3)**: Depends on US1 primary CSS complete; applies explicit classes to FR-005 surfaces

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- CSS contract before component className migration (US3)
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T004 can run in parallel within their phases
- US1 tests T005–T006 in parallel
- US2 tests T010–T012 in parallel
- US3 tests T017–T020 in parallel
- US3 implementation T021–T024 in parallel (different TSX files)
- US1 and US2 can proceed sequentially or with overlap once Foundational completes

---

## Parallel Example: User Story 3

```bash
# Launch all migration tests together (after T017 creates buttonMigration.test.ts):
npm test -- tests/theme/buttonMigration.test.ts tests/settlement/FinalizeSettlementPanel.test.tsx tests/components/qbo/SyncNowButton.test.tsx tests/components/qbo/SyncAllButton.test.tsx tests/pages/DashboardOverviewPage.test.tsx

# Launch independent TSX migrations together:
# T021 FinalizeSettlementPanel.tsx
# T022 SyncNowButton.tsx
# T023 SyncAllButton.tsx
# T024 DashboardOverviewPage.tsx + AccountingOverviewPage.tsx + EventWorkspacePage.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (shared primary CSS + tests)
4. **STOP and VALIDATE**: `npm test -- tests/theme/buttons.test.tsx` — primary contract green
5. Demo orange primary styling on any surface using `.btn-primary`

### Incremental Delivery

1. Setup + Foundational → token baseline ready
2. User Story 1 → primary styles test-verified → **MVP**
3. User Story 2 → secondary distinct from primary → deploy/demo
4. User Story 3 → FR-005 migration complete → SPLR-88 acceptance
5. Polish → coverage + quickstart → merge-ready

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (primary CSS)
   - Developer B: User Story 2 (secondary CSS) — after US1 base block reviewed
   - Developer C: User Story 3 tests (T017–T020) while A/B finish CSS
3. US3 implementation (T021–T027) after US1 CSS merged

---

## Notes

- Parent epic branch may already contain partial shared button CSS — treat T007–T009 as verify/refine, not greenfield
- **Finalize Settlement** is the largest visible gap (unstyled browser default today)
- Do not change behavioral assertions in existing sync/finalize/auth tests — theme/class assertions only
- CSS selector aliases (`.auth-form__submit` grouped with `.btn-primary`) retained for backward compatibility; FR-005 still requires explicit TSX classes
- Commit after each task or logical group; stop at any checkpoint to validate story independently
