---
description: "Task list for Legacy Slate/Blue Color Token Migration (SPLR-91, M4)"
---

# Tasks: Legacy Slate/Blue Color Token Migration

**Input**: Design documents from `/specs/068-slateblue-token-migration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-91 acceptance criteria. Frontend-only (`apps/web`). Button, badge, and data-container blocks owned by SPLR-88/89/90 are **out of scope**. WCAG audit (SPLR-94) and full color regression suite (SPLR-95) are **downstream**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, M4 dependencies, and contract baseline before hex migration.

- [x] T001 Verify on branch `068-slateblue-token-migration` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/068-slateblue-token-migration/contracts/color-token-migration.md` against current hex inventory in `apps/web/src/index.css` (note ~25 literals outside `:root`, denylist already clean per `research.md` D1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm M1 tokens and baseline theme tests; add `:root` success token definitions required by US3. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts tests/theme/legacyPalette.test.ts` in `apps/web` and confirm M1 tokens and legacy denylist scan pass — hard dependency on `059-mhc-design-tokens`
- [x] T004 [P] Add `--color-success`, `--color-success-bg`, `--color-success-border` to `:root` block in `apps/web/src/index.css` and register in `requiredCssVariables` in `apps/web/src/theme/tokens.ts` per `research.md` D4
- [x] T005 [P] Extend `apps/web/tests/theme/cssTokens.test.ts` with failing assertions for new success token definitions in `:root`

**Checkpoint**: Token foundation verified; success tokens defined; baseline denylist scan green.

---

## Phase 3: User Story 1 — Consistent Montana High Country Palette (Priority: P1) 🎯 MVP

**Goal**: Replace white shorthand and session-notice amber hex with semantic tokens across settings, dashboard, calendar, financial-health, and accounting surfaces (FR-002 partial, white-shorthand contract).

**Independent Test**: `hexBudget.test.ts` and white-surface assertions in `colorMigration.test.ts` pass; manual review of settings layout and dashboard calendar shows cream/brown/white palette with no `#fff` in component rules.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Create failing hex-budget assertions (≤5 hex outside `:root`, target 0) in `apps/web/tests/theme/hexBudget.test.ts` per `specs/068-slateblue-token-migration/contracts/color-token-migration.md`
- [x] T007 [P] [US1] Create failing white-shorthand and session-notice migration assertions in `apps/web/tests/theme/colorMigration.test.ts` for selectors listed in contract white-shorthand table and `.session-expired-notice`
- [x] T008 [P] [US1] Add failing denylist regression guard in `apps/web/tests/theme/legacyPalette.test.ts` if extending scan scope (optional — verify still passes after US1 edits)

### Implementation for User Story 1

- [x] T009 [US1] Replace `#fff` text with `var(--color-text-on-dark)` on `.dashboard-empty__cta` and `.settings-layout__header` in `apps/web/src/index.css`
- [x] T010 [P] [US1] Replace `#fff` backgrounds with `var(--color-surface-white)` on `.settings-nav__item`, `.settings-layout__content`, `.team-confirm`, `.upcoming-view-toggle`, `.upcoming-mini-calendar__day` in `apps/web/src/index.css`
- [x] T011 [P] [US1] Replace `#fff` backgrounds with `var(--color-surface-white)` on `.financial-health-widget`, `.unassigned-drawer`, `.unassigned-drawer__workspace-link`, and accounting overview panel block in `apps/web/src/index.css`
- [x] T012 [US1] Migrate `.session-expired-notice` in `apps/web/src/index.css` to `--color-warning-bg`, `--color-warning-border`, `--color-warning-text` (remove `#fef3c7`, `#fcd34d`, `#92400e`)

**Checkpoint**: White shorthand eliminated; session notice on warning tokens; US1 migration tests green.

---

## Phase 4: User Story 2 — On-Brand Form Field Appearance (Priority: P2)

**Goal**: Lock form-field token usage with automated regression tests; confirm brown borders, orange focus, and error tokens (FR-003). CSS likely already correct — tests prevent regression.

**Independent Test**: `formFieldTokens.test.ts` passes; tab through auth/register forms — focus ring orange, error state red, no blue `#2563eb`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Create failing form-field token assertions for `.form-field__input`, `:focus-visible`, `[aria-invalid='true']`, and `.form-field__error` in `apps/web/tests/theme/formFieldTokens.test.ts` per contract form-field block
- [x] T014 [P] [US2] Add failing assertion that `.form-field__*` blocks contain no `#2563eb` or denylisted slate hex in `apps/web/tests/theme/formFieldTokens.test.ts`

### Implementation for User Story 2

- [x] T015 [US2] Verify `.form-field__*` rules in `apps/web/src/index.css` match contract (token-only); apply minimal CSS fix only if T013/T014 fail

**Checkpoint**: Form field contract tests green; FR-003 locked by automation.

---

## Phase 5: User Story 3 — Harmonized Status and Feedback Colors (Priority: P3)

**Goal**: Consolidate success and error feedback banners to token families; harmonize cool green/red hex to warm semantic tokens (FR-004, FR-005).

**Independent Test**: `colorMigration.test.ts` success/error sections pass; team invite success/error banners and unassigned drawer feedback use token refs only.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T016 [P] [US3] Add failing success feedback assertions (grouped selectors, no raw green hex in rule bodies) to `apps/web/tests/theme/colorMigration.test.ts` per contract success block
- [x] T017 [P] [US3] Add failing error feedback assertions (`.team-section__banner--error`, `.unassigned-drawer__error`, `.team-modal__error`, `.team-confirm__error`) to `apps/web/tests/theme/colorMigration.test.ts`
- [x] T018 [P] [US3] Extend `apps/web/tests/theme/cssTokens.test.ts` to assert success tokens resolve in `:root` (depends on T004)

### Implementation for User Story 3

- [x] T019 [US3] Group `.team-section__banner--success`, `.unassigned-drawer__success`, and `.feedback-banner--success` with token-only colors in `apps/web/src/index.css` (remove `#ecfdf5`, `#065f46`, `#6ee7b7`, `#f0fdf4`, `#15803d` from rule bodies)
- [x] T020 [US3] Migrate error banners and modal error text in `apps/web/src/index.css` to `--color-error`, `--color-error-bg` (remove `#dc2626`, `#991b1b`, `#fef2f2`, `#b91c1c` from rule bodies)
- [x] T021 [US3] Confirm `hexBudget.test.ts` reports zero hex outside `:root` after US1+US3 migrations (adjust if intentional exceptions needed with comments)

**Checkpoint**: Success/error feedback harmonized; full hex budget at target zero.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Component exception documentation, full test suite, build verification, coverage gate, and quickstart validation.

- [x] T022 [P] Document `#111` canvas stroke as intentional out-of-scope exception in comment above stroke assignment in `apps/web/src/components/settlement/SignaturePad.tsx` per spec Assumptions
- [x] T023 Run `npm test -- tests/theme/legacyPalette.test.ts tests/theme/hexBudget.test.ts tests/theme/formFieldTokens.test.ts tests/theme/colorMigration.test.ts tests/theme/cssTokens.test.ts` in `apps/web` and resolve failures
- [x] T024 [P] Grep `apps/web/src/components` for `#[0-9a-fA-F]{3,8}` and confirm only documented `SignaturePad.tsx` exception remains (FR-007)
- [x] T025 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T026 Verify ≥80.0% line/branch coverage for modified frontend files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T027 Execute SPLR-91 validation checklist in `specs/068-slateblue-token-migration/quickstart.md` (automated grep + manual palette/form/feedback audit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP scope
- **User Story 2 (Phase 4)**: Depends on Foundational — independent of US1/US3 (form CSS already isolated)
- **User Story 3 (Phase 5)**: Depends on Foundational (success tokens from T004) — independent of US2; may run parallel with US1 after T004
- **Polish (Phase 6)**: Depends on US1, US2, US3 completion

### User Story Dependencies

| Story | Depends on | Independent test |
|-------|------------|------------------|
| US1 (P1) | Phase 2 | `hexBudget.test.ts` + white/session sections of `colorMigration.test.ts` |
| US2 (P2) | Phase 2 | `formFieldTokens.test.ts` |
| US3 (P3) | Phase 2 (success tokens) | Success/error sections of `colorMigration.test.ts` |

US1 and US3 both edit `index.css` but different selector blocks — coordinate merges; US2 is test-only if CSS already compliant.

### Parallel Opportunities

- **Phase 1**: T002 ∥ T001 (after branch verify)
- **Phase 2**: T004 ∥ T005 after T003
- **Phase 3 tests**: T006, T007, T008 all parallel
- **Phase 3 impl**: T010 ∥ T011 after T009; T012 after session test fails
- **Phase 4**: T013 ∥ T014 parallel
- **Phase 5 tests**: T016, T017, T018 parallel
- **Phase 6**: T022 ∥ T024 parallel
- **Cross-story**: After Phase 2, US2 can run fully parallel with US1; US3 impl (T019–T021) parallel with US2 if different devs

### Parallel Example: User Story 1

```bash
# Launch all US1 tests together (must FAIL before implementation):
npm run test -- tests/theme/hexBudget.test.ts        # T006
npm run test -- tests/theme/colorMigration.test.ts   # T007

# Launch parallel impl tasks after tests fail:
# T010 — settings + calendar white backgrounds
# T011 — financial-health + drawer + accounting white backgrounds
```

### Parallel Example: User Story 3

```bash
# Launch US3 tests together:
npm run test -- tests/theme/colorMigration.test.ts   # T016, T017
npm run test -- tests/theme/cssTokens.test.ts        # T018
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (success tokens + baseline)
3. Complete Phase 3: User Story 1 (white shorthand + session notice)
4. **STOP and VALIDATE**: `hexBudget.test.ts` + white-surface migration tests green
5. Demo settings/dashboard/calendar palette consistency

### Incremental Delivery

1. Setup + Foundational → token foundation ready
2. US1 → MVP palette consistency (eliminates majority of hex debt)
3. US2 → form-field regression lock (minimal CSS risk)
4. US3 → success/error harmonization
5. Polish → coverage gate + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 (white surfaces + session notice)
   - Developer B: US2 (form-field tests + verify)
   - Developer C: US3 (success/error banners) — starts after T004
3. Merge `index.css` carefully; run full theme suite after each merge

---

## Notes

- Do **not** modify `.btn-primary`, `.badge-action-required`, `.block-section`, or other SPLR-88/89/90-owned CSS blocks unless resolving merge conflicts only
- `:root` hex literals are canonical token definitions — excluded from FR-002 budget
- Target zero hex outside `:root`; document any exception with `intentional hex` comment (max 5)
- `SignaturePad.tsx` `#111` is the only permitted component inline hex
- Commit after each task or logical group; stop at any checkpoint to validate story independently

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T002 | — |
| Foundational | T003–T005 | — |
| US1 (P1) MVP | T006–T012 | 7 |
| US2 (P2) | T013–T015 | 3 |
| US3 (P3) | T016–T021 | 6 |
| Polish | T022–T027 | — |
| **Total** | **27 tasks** | |

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (T001–T012) — eliminates white shorthand and session-notice hex debt with automated hex-budget gate.
