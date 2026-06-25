---
description: "Task list for WCAG AA Contrast Audit and Token Adjustments (SPLR-94, M6)"
---

# Tasks: WCAG AA Contrast Audit and Token Adjustments

**Input**: Design documents from `/specs/071-wcag-contrast-audit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-94 acceptance criteria. Frontend-only (`apps/web`). Depends on M1–M5 token migration (`059`–`068`) and theme/onboarding (`069`) being substantially complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependency baseline, and contract inventory before contrast work.

- [x] T001 Verify on branch `071-wcag-contrast-audit` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review pairing pass/fail matrix in `specs/071-wcag-contrast-audit/contracts/wcag-contrast-audit.md` against baseline measurements in `specs/071-wcag-contrast-audit/research.md` D2 (note: border-subtle and disabled CTA require remediation)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend contrast math helpers and confirm M1 baseline tests. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/contrast.test.ts tests/theme/designTokens.test.ts` in `apps/web` and confirm existing four pairings pass — hard dependency on `059-mhc-design-tokens`
- [x] T004 Implement `compositeRgbaOnHex`, `meetsWcagAaLargeText`, and `meetsWcagAaUiComponent` in `apps/web/src/theme/contrast.ts` per `specs/071-wcag-contrast-audit/contracts/wcag-contrast-audit.md` contrast helper contract
- [x] T005 [P] Add failing unit tests for rgba compositing and new threshold helpers in `apps/web/tests/theme/contrast.test.ts` (verify tests fail before T004 implementation, then pass after)

**Checkpoint**: Contrast helpers extended; baseline M1 pairing tests green; compositing tests pass.

---

## Phase 3: User Story 1 — Readable Body Text on Light Surfaces (Priority: P1) 🎯 MVP

**Goal**: Ensure body, muted, and container-border pairings on cream/white surfaces meet WCAG AA (FR-003, FR-007); retune `--color-border-subtle` for 3:1 UI component contrast.

**Independent Test**: `designTokens.test.ts` P1 and border pairings pass; dashboard/ledger/settings show legible brown and muted text on cream with visible but subtle container borders.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Add failing normal-text pairing assertions (`brown-on-cream`, `brown-on-white`, `muted-on-cream`, `muted-on-white`) using `compositeRgbaOnHex` where needed in `apps/web/tests/theme/designTokens.test.ts` per `specs/071-wcag-contrast-audit/data-model.md` P1 inventory
- [x] T007 [P] [US1] Add failing ui-component pairing assertions (`border-subtle-on-cream`, `border-subtle-on-white`) with `minRatio: 3.0` in `apps/web/tests/theme/designTokens.test.ts`

### Implementation for User Story 1

- [x] T008 [US1] Add P1 and border pairings to `contrastPairings` in `apps/web/src/theme/tokens.ts` with `category` field per contract (tests remain red until token/CSS values fixed)
- [x] T009 [US1] Retune `--color-border-subtle` from `rgba(62, 39, 35, 0.15)` to approximately `rgba(62, 39, 35, 0.50)` in `apps/web/src/index.css` `:root` per `research.md` D5 until T007 passes
- [x] T010 [US1] Verify `--color-text-muted` at `rgba(62, 39, 35, 0.72)` in `apps/web/src/index.css` `:root`; adjust opacity only if T006 muted pairings fail (baseline expects no change)
- [x] T011 [US1] Mirror muted/border derived values in `apps/web/src/theme/tokens.ts` `colors` export for Vitest parity with `:root`

**Checkpoint**: US1 pairings pass in `designTokens.test.ts`; borders meet 3:1 on cream and white.

---

## Phase 4: User Story 2 — Legible Text on Accent Buttons and Action Controls (Priority: P2)

**Goal**: Formalize `--color-text-on-accent`, wire CTAs/badges to semantic token, and fix disabled primary button contrast without opacity-only dimming (FR-006, FR-009).

**Independent Test**: Accent pairings pass in `designTokens.test.ts`; primary CTAs and orange badges use `var(--color-text-on-accent)`; disabled CTA labels remain ≥3:1.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T012 [P] [US2] Add failing large-text accent pairing assertions (`text-on-accent-on-orange`, `text-on-accent-on-orange-hover`, `text-on-accent-on-orange-badge`, `text-on-accent-disabled-on-orange-disabled`) in `apps/web/tests/theme/designTokens.test.ts`
- [x] T013 [P] [US2] Add failing CSS contract assertions that `.btn-primary` / `.btn-primary--compact` groups use `color: var(--color-text-on-accent)` in `apps/web/tests/theme/buttons.test.tsx`
- [x] T014 [P] [US2] Add failing CSS contract assertions that `.badge-action-required` and `.badge-alert` use `var(--color-text-on-accent)` in `apps/web/tests/theme/badges.test.tsx`
- [x] T015 [P] [US2] Add failing assertion that disabled primary CTA groups do not use `opacity: 0.6` alone and reference `--color-accent-orange-disabled` in `apps/web/tests/theme/buttons.test.tsx`

### Implementation for User Story 2

- [x] T016 [US2] Add `--color-text-on-accent`, `--color-accent-orange-disabled`, and `--color-text-on-accent-disabled` to `:root` in `apps/web/src/index.css` with values passing T012 (document before values in audit later)
- [x] T017 [US2] Update `.btn-primary`, `.btn-primary--compact`, and all grouped CTA selectors to `color: var(--color-text-on-accent)` in `apps/web/src/index.css`
- [x] T018 [P] [US2] Update `.badge-action-required` and `.badge-alert` to `color: var(--color-text-on-accent)` in `apps/web/src/index.css`
- [x] T019 [US2] Replace disabled primary/compact CTA `opacity: 0.6` rules with explicit `--color-accent-orange-disabled` / `--color-text-on-accent-disabled` and `opacity: 1` in `apps/web/src/index.css`
- [x] T020 [US2] Extend `colors`, `contrastPairings`, and `requiredCssVariables` in `apps/web/src/theme/tokens.ts` for accent and disabled tokens per contract

**Checkpoint**: US2 pairing and CSS contract tests green; disabled CTA contrast ≥3:1.

---

## Phase 5: User Story 3 — Clear Navigation Text on Dark Sidebar Surfaces (Priority: P3)

**Goal**: Confirm cream-toned nav labels, focus rings, and mobile chrome on brown backgrounds meet WCAG AA (FR-002 third critical pairing).

**Independent Test**: Nav pairings pass in `designTokens.test.ts`; sidebar and mobile top bar use `--color-text-on-dark` consistently.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T021 [P] [US3] Add failing nav pairing assertions (`cream-on-brown`, `cream-focus-ring-on-brown`) in `apps/web/tests/theme/designTokens.test.ts` per `data-model.md` P3 inventory
- [x] T022 [P] [US3] Extend `apps/web/tests/theme/mobileShellTheming.test.ts` with failing assertions that `.sidebar-rail` and mobile `.top-bar` use `var(--color-text-on-dark)` for label color

### Implementation for User Story 3

- [x] T023 [US3] Verify `.sidebar-rail`, `.mobile-nav-drawer`, and mobile `.top-bar` rules in `apps/web/src/index.css` consume `var(--color-text-on-dark)` / `var(--color-bg-cream)` via tokens; apply minimal token alias fixes only if T021/T022 fail (baseline expects pass without hex changes)

**Checkpoint**: US3 nav pairings and shell theming tests green.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Semantic feedback pairings, committed audit document, full regression suite, coverage gate, and quickstart validation.

- [x] T024 [P] Add semantic feedback pairings (`error-on-error-bg`, `success-on-success-bg`, `warning-text-on-warning-bg`, `focus-ring-on-white`) to `contrastPairings` in `apps/web/src/theme/tokens.ts` and corresponding tests in `apps/web/tests/theme/designTokens.test.ts`
- [x] T025 [P] Create `apps/web/src/theme/generateContrastAudit.ts` helper that renders pairing table and token before/after rows from `contrastPairings` and `:root` values
- [x] T026 Generate and commit `apps/web/src/brand/contrast-audit.md` using `generateContrastAudit.ts` (summary, methodology, pairing results, token changes per FR-008)
- [x] T027 [P] Create failing `apps/web/tests/theme/contrastAudit.test.ts` asserting `contrast-audit.md` exists and contains every `contrastPairings[].id` plus token change table when values changed
- [x] T028 Run `npm test -- tests/theme/contrast.test.ts tests/theme/designTokens.test.ts tests/theme/contrastAudit.test.ts tests/theme/buttons.test.tsx tests/theme/badges.test.tsx tests/auth/LoginForm.test.tsx` in `apps/web` and resolve failures (FR-010)
- [x] T029 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T030 Verify ≥80.0% line/branch coverage for `apps/web/src/theme/contrast.ts`, `apps/web/src/theme/tokens.ts`, `apps/web/src/theme/generateContrastAudit.ts`, and new test files via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A
- [x] T031 Execute SPLR-94 validation checklist in `specs/071-wcag-contrast-audit/quickstart.md` (automated gates + manual spot-check table)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP scope**
- **User Story 2 (Phase 4)**: Depends on Foundational; independent of US1 completion (may run parallel after Phase 2)
- **User Story 3 (Phase 5)**: Depends on Foundational; independent of US1/US2 (may run parallel after Phase 2)
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Phase 2 | `designTokens.test.ts` P1 + border pairings |
| US2 | P2 | Phase 2 | `designTokens.test.ts` accent pairings + `buttons.test.tsx` / `badges.test.tsx` |
| US3 | P3 | Phase 2 | `designTokens.test.ts` nav pairings + `mobileShellTheming.test.ts` |

### Within Each User Story

- Tests (T006–T007, T012–T015, T021–T022) MUST be written and FAIL before implementation tasks in that phase
- Update `tokens.ts` pairings before or alongside CSS token fixes
- Story checkpoint before starting Polish

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001 (after install)
- **Phase 2**: T005 parallel with T003 (after T004)
- **Phase 3**: T006 ∥ T007; after T008–T011 complete, US1 done
- **Phase 4**: T012 ∥ T013 ∥ T014 ∥ T015; T018 parallel with T017 after T016
- **Phase 5**: T021 ∥ T022
- **Cross-story**: After Phase 2, US1 + US2 + US3 can be staffed in parallel by different developers
- **Polish**: T024 ∥ T025; T027 after T026

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together (after Phase 2):
npm test -- tests/theme/designTokens.test.ts   # T012 accent pairings
npm test -- tests/theme/buttons.test.tsx         # T013, T015 CTA contracts
npm test -- tests/theme/badges.test.tsx         # T014 badge contracts

# After T016 token definitions, parallel CSS updates:
# T017 btn-primary groups in apps/web/src/index.css
# T018 badge utilities in apps/web/src/index.css
```

---

## Parallel Example: User Story 1

```bash
# Launch US1 test additions together:
# T006 normal-text pairings in apps/web/tests/theme/designTokens.test.ts
# T007 border ui-component pairings in apps/web/tests/theme/designTokens.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (body text + borders)
4. **STOP and VALIDATE**: `npm test -- tests/theme/designTokens.test.ts` for P1 pairings
5. Optional demo: verify dashboard/ledger readability

### Incremental Delivery

1. Setup + Foundational → contrast helpers ready
2. US1 → border + body text AA → Validate (MVP)
3. US2 → accent CTAs + disabled states → Validate
4. US3 → nav chrome → Validate
5. Polish → audit doc + full regression + coverage

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 (T006–T011)
   - Developer B: US2 (T012–T020)
   - Developer C: US3 (T021–T023)
3. Merge and run Polish (T024–T031)

---

## Notes

- Remediation MUST stay at token layer in `index.css` `:root` and shared utilities — no per-component hex overrides (FR-005)
- Document before/after token values in `contrast-audit.md` for any `:root` change (FR-008)
- Cream-on-orange (~3.36:1) is documented as fail reference only — production uses white-on-accent
- `LoginForm.test.tsx` a11y test is a regression guard — do not weaken aria associations

---

## Task Summary

| Phase | Task IDs | Count |
|-------|----------|-------|
| Setup | T001–T002 | 2 |
| Foundational | T003–T005 | 3 |
| US1 (P1) | T006–T011 | 6 |
| US2 (P2) | T012–T020 | 9 |
| US3 (P3) | T021–T023 | 3 |
| Polish | T024–T031 | 8 |
| **Total** | **T001–T031** | **31** |
