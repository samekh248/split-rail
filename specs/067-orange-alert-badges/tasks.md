---
description: "Task list for Alert and Action-Required Badges (SPLR-90, M4)"
---

# Tasks: Alert and Action-Required Badges (Orange Pills)

**Input**: Design documents from `/specs/067-orange-alert-badges/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-90 acceptance criteria. Frontend-only (`apps/web`). Bottleneck filter toggle, neutral booking/deduction chips, backend API changes, and full legacy hex migration (SPLR-91) are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependencies, and contract baseline before badge work.

- [x] T001 Verify on branch `067-orange-alert-badges` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/067-orange-alert-badges/contracts/alert-badge-styles.md` against current badge block and event-card chip rules in `apps/web/src/index.css` (note `.badge-alert` alias gap, legacy amber/red hex on chips, and TSX surfaces missing `badge-action-required` per `research.md` D4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm M1 design tokens are present and baseline badge tests run. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts` in `apps/web` and confirm M1 tokens (`--color-accent-orange`, `--color-surface-white`, `--color-warning-bg`) pass — hard dependency on `059-mhc-design-tokens`
- [x] T004 [P] Run baseline `npm test -- tests/theme/badges.test.tsx tests/theme/legacyPalette.test.ts` in `apps/web` and record current pass/fail state before extending assertions

**Checkpoint**: Token foundation verified; baseline badge tests recorded.

---

## Phase 3: User Story 1 — Recognize Action-Required Items at a Glance (Priority: P1) 🎯 MVP

**Goal**: Shared `.badge-action-required` / `.badge-alert` orange pill utilities and FR-002/FR-003 surface migration (event-card alert chips, unmapped banner, accounting workload badges).

**Independent Test**: Load dashboard event cards and ledger unmapped notice — every operational alert label is a compact Alpine Sunset pill with white bold text; `badgeMigration.test.tsx` passes for FR-002/FR-003 surfaces.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Extend failing `.badge-alert` alias and `font-size: 0.75rem` assertions in `apps/web/tests/theme/badges.test.tsx` per `specs/067-orange-alert-badges/contracts/alert-badge-styles.md`
- [x] T006 [P] [US1] Create failing FR-002/FR-003 migration assertions in `apps/web/tests/theme/badgeMigration.test.tsx` (EventCard alert chips, UnmappedBanner, AccountingWorkloadList)
- [x] T007 [P] [US1] Add failing `badge-action-required` class assertion on bottleneck alert chips in `apps/web/tests/components/dashboard/EventCard.theme.test.tsx`
- [x] T008 [P] [US1] Add failing `badge-action-required` assertion in `apps/web/tests/qbo/UnmappedBanner.test.tsx` when unmapped count > 0

### Implementation for User Story 1

- [x] T009 [US1] Add grouped `.badge-alert` selector alongside `.badge-action-required` in `apps/web/src/index.css` per contract (identical rules, no color drift)
- [x] T010 [US1] Add `badge-action-required` to bottleneck alert chip `className` in `apps/web/src/components/dashboard/EventCard.tsx` and strip color/typography from `.event-card__alert-chip` in `apps/web/src/index.css` (layout-only rules remain)
- [x] T011 [P] [US1] Render `badge-action-required` label span inside toggle in `apps/web/src/components/qbo/UnmappedBanner.tsx` per contract migration matrix
- [x] T012 [P] [US1] Apply `badge-action-required` to unassigned count and alert label spans in `apps/web/src/components/accounting/AccountingWorkloadList.tsx`
- [x] T013 [US1] Add layout-only spacing hooks for workload badges in `apps/web/src/index.css` if needed (margin/gap only — no color overrides)

**Checkpoint**: Action-required orange pills visible on event cards, unmapped banner, and accounting workload; migration tests green.

---

## Phase 4: User Story 2 — Distinguish Variance Data from Action Badges (Priority: P2)

**Goal**: Flagged variance cells, ledger variance banner, and event-card variance indicator retain warning-token styling and MUST NOT use orange action pill class (FR-004, FR-005).

**Independent Test**: Reconciled ledger with variances — flagged cells and banner use warning background; event-card variance chip uses warning tokens; none carry `badge-action-required`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T014 [P] [US2] Add failing assertion that `[data-testid^="event-card-variance-"]` does NOT have class `badge-action-required` in `apps/web/tests/components/dashboard/EventCard.theme.test.tsx`
- [x] T015 [P] [US2] Add failing variance-exclusion assertions (variance cell, variance banner) in `apps/web/tests/theme/badgeMigration.test.tsx`
- [x] T016 [P] [US2] Add failing legacy hex denylist assertions for `#fef3c7`, `#92400e`, `#fee2e2`, `#991b1b` in event-card badge CSS blocks via extended checks in `apps/web/tests/theme/badges.test.tsx` or `apps/web/tests/theme/legacyPalette.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Migrate `.event-card__variance-badge` in `apps/web/src/index.css` to warning tokens (`--color-warning-bg`, `--color-accent-orange-hover`) — remove legacy red hex literals
- [x] T018 [US2] Verify `.variance-cell--flagged` and `.ledger-grid__variance-banner` in `apps/web/src/index.css` use warning tokens only and are not grouped with `.badge-action-required`
- [x] T019 [US2] Confirm `apps/web/src/components/dashboard/EventCard.tsx` variance span retains `event-card__variance-badge` only (no `badge-action-required`); confirm `apps/web/src/components/ledger/VarianceCell.tsx` and `apps/web/src/components/ledger/LedgerGrid.tsx` unchanged except if hex cleanup needed in CSS

**Checkpoint**: Variance surfaces visually distinct from orange action pills; legacy hex removed from event-card badge blocks.

---

## Phase 5: User Story 3 — Readable Badges on Brand Backgrounds (Priority: P3)

**Goal**: WCAG AA contrast (4.5:1) for white badge text on Alpine Sunset; badges legible on white and cream surfaces (FR-008, SC-003).

**Independent Test**: `contrast.test.ts` validates `white-on-orange-badge` pairing ≥4.5:1; manual spot-check on dashboard white cards over cream background.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T020 [P] [US3] Add failing `white-on-orange-badge` entry expectation (minRatio 4.5) exercised by existing loop in `apps/web/tests/theme/contrast.test.ts` — fails until `tokens.ts` updated

### Implementation for User Story 3

- [x] T021 [US3] Add `white-on-orange-badge` contrast pairing to `contrastPairings` in `apps/web/src/theme/tokens.ts` (foreground `surfaceWhite`, background `accentOrange`, minRatio 4.5)
- [x] T022 [US3] Verify badge utility in `apps/web/src/index.css` uses `--color-surface-white` label on `--color-accent-orange` background at `0.75rem` / weight 700 (no hardcoded hex in badge block)

**Checkpoint**: Automated contrast gate passes for badge label pairing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, and quickstart validation.

- [x] T023 Run `npm test -- tests/theme/badges.test.tsx tests/theme/badgeMigration.test.tsx tests/theme/contrast.test.ts tests/theme/legacyPalette.test.ts tests/components/dashboard/EventCard.theme.test.tsx tests/components/dashboard/EventCard.test.tsx tests/qbo/UnmappedBanner.test.tsx` in `apps/web` and resolve failures
- [x] T024 [P] Create `apps/web/tests/components/accounting/AccountingWorkloadList.theme.test.tsx` with badge class assertions if not covered by `badgeMigration.test.tsx`
- [x] T025 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T026 Verify ≥80.0% line/branch coverage for modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T027 Execute SPLR-90 validation checklist in `specs/067-orange-alert-badges/quickstart.md` (automated grep + manual orange-pill / variance-distinction audit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–5)**: Depend on Foundational completion; recommended order P1 → P2 → P3 (US2 benefits from US1 badge utility; US3 can run in parallel with US2 after US1 CSS exists)
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on US2/US3
- **User Story 2 (P2)**: Can start after US1 badge utility exists (T009) — independently testable via variance exclusion tests
- **User Story 3 (P3)**: Can start after Foundational — independent of US1/US2 implementation (tokens-only); recommended after US1 to validate final badge colors

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- CSS contract before TSX className migration (US1)
- Variance token migration (US2) before declaring semantic split complete
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T004 can run in parallel within their phases
- US1 tests T005–T008 in parallel
- US1 implementation T011–T012 in parallel (different TSX files)
- US2 tests T014–T016 in parallel
- US3 test T020 can run while US2 implementation proceeds (different files)
- US1 and US3 contrast work can overlap once T009 completes

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (after creating badgeMigration.test.tsx):
npm test -- tests/theme/badges.test.tsx tests/theme/badgeMigration.test.tsx tests/components/dashboard/EventCard.theme.test.tsx tests/qbo/UnmappedBanner.test.tsx

# Launch independent TSX migrations together:
# T011 UnmappedBanner.tsx
# T012 AccountingWorkloadList.tsx
```

---

## Parallel Example: User Story 2

```bash
# Launch variance exclusion tests together:
npm test -- tests/components/dashboard/EventCard.theme.test.tsx tests/theme/badgeMigration.test.tsx

# CSS migration (sequential on index.css — T017 then T018):
# T017 event-card__variance-badge tokens
# T018 verify variance-cell + variance-banner unchanged semantics
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (shared badge CSS + FR-002/FR-003 migration)
4. **STOP and VALIDATE**: `npm test -- tests/theme/badges.test.tsx tests/theme/badgeMigration.test.tsx` — action-required surfaces green
5. Demo orange pill badges on dashboard event cards

### Incremental Delivery

1. Setup + Foundational → token baseline ready
2. User Story 1 → action-required pills on all in-scope surfaces → **MVP**
3. User Story 2 → variance semantics preserved and tokenized → deploy/demo
4. User Story 3 → contrast pairing verified → accessibility gate
5. Polish → coverage + quickstart → merge-ready

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (badge CSS + EventCard + tests)
   - Developer B: User Story 1 TSX migrations (UnmappedBanner + AccountingWorkloadList)
   - Developer C: User Story 2 tests (T014–T016) while A finishes T009–T010
3. US2 implementation (T017–T019) after US1 badge utility merged; US3 (T020–T022) in parallel with US2 CSS if no index.css conflicts

---

## Notes

- Parent epic branch already contains partial `.badge-action-required` CSS — treat T009 as verify/extend (add alias), not greenfield
- **EventCard alert chips** and **UnmappedBanner TSX** are the largest visible gaps (legacy amber hex / no badge class in markup)
- Do not change behavioral assertions in existing `EventCard.test.tsx` or `UnmappedBanner.test.tsx` — theme/class assertions only
- Variance surfaces must never receive `badge-action-required` — enforce in migration and theme tests
- Commit after each task or logical group; stop at any checkpoint to validate story independently
