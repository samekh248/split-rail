---
description: "Task list for White-on-Cream Data Container Theming (SPLR-89, M4)"
---

# Tasks: White-on-Cream Data Container Theming

**Input**: Design documents from `/specs/066-white-cream-containers/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US4) aligned with SPLR-89 acceptance criteria. Frontend-only (`apps/web`). Settings/team `#fff` surfaces, alert badge chip colors, full legacy hex migration (SPLR-91), and auth flow redesign (M5 / SPLR-92) are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US4)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependencies, and contract baseline before container work.

- [x] T001 Verify on branch `066-white-cream-containers` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/066-white-cream-containers/contracts/data-container-theming.md` against current container blocks in `apps/web/src/index.css` (note `.event-card` `#fff` gap and duplicate container rules per `research.md` D4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm M1 design tokens and cream workspace baseline; record existing theme test state. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts` in `apps/web` and confirm M1 tokens (`--color-surface-white`, `--color-bg-cream`, `--color-border-subtle`, `--radius-card`, `--shadow-soft`) pass — hard dependency on `059-mhc-design-tokens`
- [x] T004 [P] Run baseline `npm test -- tests/components/ledger/LedgerGrid.theme.test.tsx tests/theme/legacyPalette.test.ts` in `apps/web` and record current pass/fail state before extending assertions
- [x] T005 [P] Run baseline `npm test -- tests/components/dashboard/EventCard.test.tsx tests/onboarding/WelcomeModal.theme.test.tsx` in `apps/web` and confirm behavioral/theme tests pass before container CSS changes

**Checkpoint**: Token foundation verified; baseline tests recorded.

---

## Phase 3: User Story 1 — Data Cards on Cream Workspace (Priority: P1) 🎯 MVP

**Goal**: Ledger and dashboard data containers (block sections, summary panels, deal panels, event cards) use Pure White surfaces with subtle depth on Canvas Cream workspace (FR-001, FR-002, FR-003).

**Independent Test**: Open ledger and dashboard — block sections, summary strip, artist deal panel, and event cards share white token background, subtle border/shadow, and `--radius-card` corners.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Create failing shared container CSS contract in `apps/web/tests/theme/dataContainers.test.ts` — assert grouped selectors use `var(--color-surface-white)`, `.event-card` does NOT contain `background: #fff`, per `specs/066-white-cream-containers/contracts/data-container-theming.md`
- [x] T007 [P] [US1] Create failing `EventCard.theme.test.tsx` in `apps/web/tests/components/dashboard/EventCard.theme.test.tsx` — render `EventCard` with fixture event and assert root element has class `event-card`
- [x] T008 [US1] Extend failing `.artist-deal-panel` white-surface assertion in `apps/web/tests/components/ledger/LedgerGrid.theme.test.tsx`

### Implementation for User Story 1

- [x] T009 [US1] Add shared grouped container selector block (`.block-section`, `.ledger-grid__summary`, `.artist-deal-panel`, `.ledger-grid__artists`, `.event-card`) with token background, border, radius, and shadow in `apps/web/src/index.css` per contract
- [x] T010 [US1] Refactor `.event-card` in `apps/web/src/index.css` — replace `#fff` with `var(--color-surface-white)`, add `box-shadow: var(--shadow-soft)`, use `border-radius: var(--radius-card)`; retain layout-only rules (padding, flex, gap)
- [x] T011 [US1] Remove duplicate background/border/shadow declarations from individual `.block-section`, `.ledger-grid__summary`, and `.artist-deal-panel` blocks in `apps/web/src/index.css` — keep layout-only rules (padding, margin, flex)
- [x] T012 [P] [US1] Verify `apps/web/src/components/dashboard/EventCard.tsx` root element retains `className="event-card"` (no logic changes expected)

**Checkpoint**: Data cards visually consistent; `dataContainers.test.ts` and `EventCard.theme.test.tsx` green for container base rules.

---

## Phase 4: User Story 2 — Branded Table Headers (Priority: P1)

**Goal**: Ledger table header rows use warm cream-derived tint (`var(--color-bg-cream)`) with Lodgepole Brown readable body text — no legacy cool-gray headers (FR-004, FR-005).

**Independent Test**: Load ledger grid with line items — header row is cream-tinted, body text is brown on white, no `#f8fafc` in table header rules.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US2] Add failing `.ledger-table th` cream background assertion (`var(--color-bg-cream)`) and `#f8fafc` absence check in `apps/web/tests/theme/dataContainers.test.ts`
- [x] T014 [US2] Add failing `.ledger-table th` cream header assertion in `apps/web/tests/components/ledger/LedgerGrid.theme.test.tsx`

### Implementation for User Story 2

- [x] T015 [US2] Verify and enforce `.ledger-table th { background: var(--color-bg-cream); }` in `apps/web/src/index.css`; remove any cool-gray hex if present in ledger table header rules
- [x] T016 [US2] Verify ledger table body cells inherit `var(--color-primary-brown)` text via `:root` / table rules in `apps/web/src/index.css`; add explicit color on `.ledger-table td` only if inheritance is broken

**Checkpoint**: Table header contract satisfied; cream tint visible on ledger grids.

---

## Phase 5: User Story 3 — Modals Match Data Surfaces (Priority: P2)

**Goal**: In-app operational modals use Pure White panel treatment with modal shadow, consistent with inline data cards (FR-006). Auth card verify-only for M5.

**Independent Test**: Trigger welcome modal — white panel, subtle border, `--shadow-modal` on brown scrim; auth card already tokenized.

### Tests for User Story 3 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US3] Add failing `.welcome-modal` white surface + `var(--shadow-modal)` assertions in `apps/web/tests/theme/dataContainers.test.ts`
- [x] T018 [US3] Extend `apps/web/tests/onboarding/WelcomeModal.theme.test.tsx` with assertion that modal panel element (`.welcome-modal`) is present alongside existing class checks — no behavioral assertion changes

### Implementation for User Story 3

- [x] T019 [US3] Verify `.welcome-modal` and `.welcome-modal__backdrop` rules in `apps/web/src/index.css` match contract (white bg, `--color-border-subtle`, `--shadow-modal`); adjust only if tests fail
- [x] T020 [P] [US3] Verify `.auth-layout__card` in `apps/web/src/index.css` already uses token white surface + `--shadow-card` per M5 deferral in `specs/066-white-cream-containers/spec.md` — no TSX changes to `apps/web/src/components/auth/AuthLayout.tsx` unless contract fails

**Checkpoint**: Modal and auth reference surfaces documented and test-verified.

---

## Phase 6: User Story 4 — Regression-Safe Container Theming (Priority: P2)

**Goal**: Automated tests guard container styling; existing ledger and dashboard behavioral suites pass unchanged (FR-009, FR-010).

**Independent Test**: Full theme + behavioral test run passes; coverage ≥80% on modified frontend files.

### Tests for User Story 4 (REQUIRED) ⚠️

- [x] T021 [P] [US4] Add failing in-scope selector checklist coverage (all FR-001 selectors present in grouped block or equivalent) in `apps/web/tests/theme/dataContainers.test.ts`
- [x] T022 [US4] Run and confirm pass: `npm test -- tests/ledger/LedgerGrid.test.tsx tests/ledger/BlockSection.test.tsx` in `apps/web` — no behavioral assertion changes from container CSS work

### Implementation for User Story 4

- [x] T023 [US4] Run `npm test -- tests/components/dashboard/EventCard.test.tsx tests/onboarding/WelcomeModal.theme.test.tsx tests/components/ledger/LedgerGrid.theme.test.tsx tests/theme/dataContainers.test.ts` in `apps/web` and resolve any failures introduced by container changes

**Checkpoint**: All container theme and behavioral regression tests green.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, and quickstart validation.

- [x] T024 Run full SPLR-89 automated suite in `apps/web`: `npm test -- tests/theme/dataContainers.test.ts tests/components/ledger/LedgerGrid.theme.test.tsx tests/components/dashboard/EventCard.theme.test.tsx tests/theme/legacyPalette.test.ts tests/ledger/LedgerGrid.test.tsx tests/components/dashboard/EventCard.test.tsx tests/onboarding/WelcomeModal.theme.test.tsx`
- [x] T025 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T026 Verify ≥80.0% line/branch coverage for modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T027 Execute SPLR-89 validation checklist in `specs/066-white-cream-containers/quickstart.md` (automated grep for `#fff` in in-scope selectors + manual three-screen audit: ledger blocks, dashboard event cards, modal overlay)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–6)**: Depend on Foundational completion; US1 and US2 are both P1 — US2 can start after US1 grouped selector exists or in parallel if table header rules are independent
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on US2/US3/US4
- **User Story 2 (P1)**: Can start after Foundational — independent CSS block (`.ledger-table th`); tests may share `dataContainers.test.ts` file started in US1
- **User Story 3 (P2)**: Can start after Foundational — independent of US1/US2 completion for modal CSS; `dataContainers.test.ts` extended incrementally
- **User Story 4 (P2)**: Depends on US1–US3 test files existing; validates full regression

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- CSS contract changes in `index.css` before TSX verification tasks
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T004, T005 can run in parallel within their phases
- US1 tests T006–T007 in parallel
- US1 implementation T012 can run parallel to CSS tasks (verification only)
- US2 test T013 parallel with US1 if `dataContainers.test.ts` created first
- US3 tests T017 parallel with US2 implementation
- US4 test T021 parallel with US3 implementation once base `dataContainers.test.ts` exists

---

## Parallel Example: User Story 1

```bash
# Launch failing tests together (after T006 creates dataContainers.test.ts):
npm test -- tests/theme/dataContainers.test.ts tests/components/dashboard/EventCard.theme.test.tsx tests/components/ledger/LedgerGrid.theme.test.tsx

# Expected: FAIL on .event-card #fff and missing grouped selector before T009–T011
```

---

## Parallel Example: User Story 2 + 3

```bash
# After US1 CSS merged, extend table + modal assertions in parallel:
# Developer A: T013–T015 table header work in dataContainers.test.ts + index.css
# Developer B: T017–T019 modal contract in dataContainers.test.ts + WelcomeModal.theme.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (grouped container CSS + event-card fix + tests)
4. **STOP and VALIDATE**: `npm test -- tests/theme/dataContainers.test.ts tests/components/dashboard/EventCard.theme.test.tsx` — container contract green
5. Demo white cards on cream for ledger blocks and dashboard event cards

### Incremental Delivery

1. Setup + Foundational → token baseline ready
2. User Story 1 → data cards test-verified → **MVP**
3. User Story 2 → table headers cream-tinted → deploy/demo
4. User Story 3 → modals aligned → deploy/demo
5. User Story 4 + Polish → full regression + coverage → merge-ready

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (container CSS consolidation)
   - Developer B: User Story 2 (table headers) — after T006 creates shared test file
   - Developer C: User Story 3 (modal verify) — can overlap with US2
3. User Story 4 + Polish after US1–US3 merge

---

## Notes

- Ledger containers (`.block-section`, `.ledger-grid__summary`, `.artist-deal-panel`) are **~75% complete** on current branch — treat T009–T011 as consolidate/refine, not greenfield
- **`.event-card`** is the largest visible gap (`background: #fff`, no shadow)
- Do not change behavioral assertions in existing ledger/dashboard/modal tests — theme/class/CSS contract assertions only
- Settings nav and other out-of-scope `#fff` literals remain for SPLR-91 — do not expand scope during this milestone
- `dataContainers.test.ts` is created in US1 and extended incrementally in US2–US4
- Commit after each task or logical group; stop at any checkpoint to validate story independently
