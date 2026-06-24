---
description: "Task list for Global Typography Rules for Headings and UI Text (SPLR-81)"
---

# Tasks: Global Typography Rules for Headings and UI Text

**Input**: Design documents from `/specs/061-global-typography-rules/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest CSS contract tests in `apps/web/tests/theme/typography.test.ts` (write tests first, ensure they fail before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) for independent implementation and testing. Frontend-only (`apps/web`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm upstream dependencies and scaffold the theme test file location.

- [x] T001 Verify `059-mhc-design-tokens` and `060-brand-web-fonts` are merged on the current branch (or cherry-picked) so `apps/web/src/index.css` `:root` exposes `--font-heading`, `--font-ui`, `--color-primary-brown`, and `--color-bg-cream` per `specs/061-global-typography-rules/research.md` R6
- [x] T002 [P] Create `apps/web/tests/theme/typography.test.ts` scaffold (empty `describe` + `readFileSync` helper for `apps/web/src/index.css`) per `specs/061-global-typography-rules/contracts/global-typography.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared CSS test harness and documentation comment skeleton. **No user story work can begin until this phase is complete.**

- [x] T003 Add the `/* Typography */` section header and FR-004 documentation comment block (listing `h1`–`h3`, `.heading-brand`, UI element selectors, `.text-on-dark`) in `apps/web/src/index.css` — rules themselves remain unimplemented until story phases
- [x] T004 [P] Add shared `readIndexCss()` helper and baseline test that `apps/web/src/index.css` contains the Typography documentation comment in `apps/web/tests/theme/typography.test.ts`

**Checkpoint**: Token prerequisites confirmed; test harness reads `index.css`; documentation comment placeholder exists.

---

## Phase 3: User Story 1 — Consistent Branded Headings (Priority: P1) 🎯 MVP

**Goal**: Global heading rules so dashboard title, auth card title, and semantic `h1`–`h3` / `.heading-brand` render in slab-serif, bold, primary brown.

**Independent Test**: Open dashboard home and login screen — both `h1` titles inherit brand heading typography without per-page `font-family` overrides (spec US1, FR-005, FR-006).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Write failing CSS contract tests for `h1`–`h3` and `.heading-brand` (`font-family: var(--font-heading)`, `font-weight: 700`, `color: var(--color-primary-brown)`) in `apps/web/tests/theme/typography.test.ts` per `specs/061-global-typography-rules/contracts/global-typography.md`

### Implementation for User Story 1

- [x] T006 [US1] Add global heading rules for `h1`, `h2`, `h3`, `.heading-brand` in the Typography section of `apps/web/src/index.css` (make T005 pass)
- [x] T007 [US1] Remove conflicting `font-family`, `font-weight`, and heading `color` overrides from `.auth-layout__title` in `apps/web/src/index.css` while preserving `font-size`, `margin`, and layout properties per override policy in `specs/061-global-typography-rules/contracts/global-typography.md`
- [x] T008 [P] [US1] Run `npm run test -- tests/theme/typography.test.ts` from `apps/web` and confirm heading contract tests pass

**Checkpoint**: User Story 1 complete — branded headings apply globally; auth card title inherits without component font overrides.

---

## Phase 4: User Story 2 — Readable UI and Data Text (Priority: P2)

**Goal**: Global UI text defaults so `body`, `p`, `label`, `button`, `input`, `td`, `th` use the sans-serif stack from `--font-ui`.

**Independent Test**: Open login form and event ledger table — labels, inputs, buttons, and table cells use UI sans-serif (spec US2, FR-007).

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T009 [P] [US2] Write failing CSS contract tests for `body`, `p`, `label`, `button`, `input`, `td`, `th` (`font-family: var(--font-ui)`) in `apps/web/tests/theme/typography.test.ts` per `specs/061-global-typography-rules/contracts/global-typography.md`

### Implementation for User Story 2

- [x] T010 [US2] Add global UI text rules for `body`, `p`, `label`, `button`, `input`, `td`, `th` in the Typography section of `apps/web/src/index.css` (make T009 pass)
- [x] T011 [US2] Remove conflicting `font-family` overrides on governed form and table selectors in legacy blocks of `apps/web/src/index.css` (e.g. `.auth-form`, `.ledger-table`, `.auth-layout__link` `font: inherit` is acceptable — do not break link styling)
- [x] T012 [P] [US2] Run `npm run test -- tests/theme/typography.test.ts` from `apps/web` and confirm UI text contract tests pass

**Checkpoint**: User Stories 1 AND 2 work independently — headings and UI text each have global defaults with passing contract tests.

---

## Phase 5: User Story 3 — Legible Text on Dark Brand Surfaces (Priority: P3)

**Goal**: `.text-on-dark` utility applies canvas-cream token color; app header text adopts it for legibility on dark surfaces.

**Independent Test**: Dashboard header title/subtitle render cream-toned text via `.text-on-dark` without hard-coded hex (spec US3, FR-003).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T013 [P] [US3] Write failing CSS contract test for `.text-on-dark` (`color: var(--color-bg-cream)`) and documentation comment listing the utility in `apps/web/tests/theme/typography.test.ts` per `specs/061-global-typography-rules/contracts/global-typography.md`

### Implementation for User Story 3

- [x] T014 [US3] Add `.text-on-dark { color: var(--color-bg-cream); }` rule in the Typography section of `apps/web/src/index.css` (make T013 pass)
- [x] T015 [US3] Apply `text-on-dark` class to header `h1` and `.app__subtitle` in `apps/web/src/pages/DashboardHome.tsx` so dark-surface text uses the utility instead of legacy `color: #fff` / opacity hacks in `apps/web/src/index.css`
- [x] T016 [US3] Remove or narrow legacy header text color rules (`.app__header`, `.app__header h1`, `.app__subtitle` color/opacity) in `apps/web/src/index.css` that conflict with `.text-on-dark` adoption
- [x] T017 [P] [US3] Run `npm run test -- tests/theme/typography.test.ts` from `apps/web` and confirm `.text-on-dark` contract tests pass

**Checkpoint**: All three user stories complete — headings, UI text, and dark-surface utility independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, coverage gate, and manual validation across representative pages.

- [x] T018 Run full `npm run test` from `apps/web` and fix any failures attributable to typography changes (FR-009, SC-004)
- [x] T019 [P] Run `npm run test:coverage` from `apps/web` and confirm ≥80.0% lines/functions/branches/statements gate passes (SC-006, Constitution III); missing or unparseable lcov report FAILS
- [x] T020 [P] Validate login, dashboard home, and event ledger at ≈375px and ≈1280px viewports for overflow/clipping regressions per `specs/061-global-typography-rules/quickstart.md` (FR-008, SC-003)
- [x] T021 Confirm Typography documentation comment in `apps/web/src/index.css` lists all governed selectors without reading individual page components (FR-004, SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001 token prerequisite) — **BLOCKS all user stories**
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US2 builds on US1 only in file order (`index.css` same file) — implement sequentially unless splitting CSS edits carefully
  - US3 can start after US1 heading rules exist (header adopts `.text-on-dark`)
- **Polish (Phase 6)**: Depends on US1–US3 (or MVP + chosen stories)

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| **US1 (P1)** | Foundational | Heading CSS contract tests + visual check on login/dashboard `h1` |
| **US2 (P2)** | Foundational (+ US1 recommended for same-file CSS ordering) | UI selector CSS contract tests + form/table visual check |
| **US3 (P3)** | Foundational, US1 (header headings exist) | `.text-on-dark` contract test + dashboard header cream text |

### Within Each User Story

- Tests MUST be written and FAIL before CSS implementation
- Contract tests in `typography.test.ts` before `index.css` rule additions
- Component markup changes (`DashboardHome.tsx`) only in US3 after utility exists

### Parallel Opportunities

- T002 ∥ T001 (different concerns — scaffold vs. dependency check)
- T004 ∥ T003 (test file vs. CSS comment block) once T002 exists
- T005 ∥ (nothing else in US1 until T005 written)
- T008, T012, T017 — run after their story's implementation
- T019 ∥ T020 after T018 passes

---

## Parallel Example: User Story 1

```bash
# From apps/web — after T005 written and failing:
# Implement T006 + T007 sequentially (same index.css file)
npm run test -- tests/theme/typography.test.ts
```

---

## Parallel Example: User Story 2

```bash
# After US1 checkpoint — write T009 (failing), then T010–T011:
npm run test -- tests/theme/typography.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: User Story 1 (T005–T008)
4. **STOP and VALIDATE**: Heading contract tests pass; login + dashboard `h1` show brand typography
5. Demo/deploy if ready

### Incremental Delivery

1. Setup + Foundational → token + test harness ready
2. US1 → branded headings globally (MVP)
3. US2 → UI sans-serif defaults on forms and tables
4. US3 → `.text-on-dark` + header adoption
5. Polish → full suite + coverage + manual regression

### Parallel Team Strategy

With two developers after Foundational:

- **Developer A**: US1 (T005–T008) then US3 (T013–T017) — headings + dark utility
- **Developer B**: Wait for US1 T006 checkpoint, then US2 (T009–T012) — UI text rules

Coordinate on `apps/web/src/index.css` to avoid merge conflicts.

---

## Notes

- Use `--font-heading` (not `--font-brand`) per `specs/061-global-typography-rules/research.md` R1
- Do not add `@font-face` or `:root` token definitions — owned by specs `060` and `059`
- Monospace formula editor styling is out of scope
- Total tasks: **21** (Setup: 2, Foundational: 2, US1: 4, US2: 4, US3: 5, Polish: 4)
