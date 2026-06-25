---
description: "Task list for Automated Design Token and Color Regression Tests (SPLR-95, M6)"
---

# Tasks: Automated Design Token and Color Regression Tests

**Input**: Design documents from `/specs/072-design-token-regression-tests/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-95 acceptance criteria. Frontend-only (`apps/web`). Depends on M1 tokens (`059`), SPLR-91 migration (`068`), and SPLR-94 contrast audit (`071`) being substantially complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, dependency baseline, and contract inventory before brand regression work.

- [x] T001 Verify on branch `072-design-token-regression-tests` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review parity matrix, denylist contract, and failure-message rules in `specs/072-design-token-regression-tests/contracts/design-token-regression.md` against decisions in `specs/072-design-token-regression-tests/research.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared CSS parser and canonical parity map. **No user story work can begin until this phase is complete.**

- [x] T003 Run `npm test -- tests/theme/cssTokens.test.ts tests/theme/legacyPalette.test.ts tests/theme/designTokens.test.ts` in `apps/web` and confirm existing theme baseline passes — hard dependency on `059`–`071` milestones
- [x] T004 [P] Add failing unit tests for `extractRootBlock`, `parseRootCustomProperties`, and hex/rgba normalizers in `apps/web/tests/theme/parseCssRoot.test.ts` per `specs/072-design-token-regression-tests/contracts/design-token-regression.md` comparison rules
- [x] T005 Implement `extractRootBlock`, `parseRootCustomProperties`, `normalizeHex`, and `normalizeRgba` in `apps/web/src/theme/parseCssRoot.ts` until T004 passes
- [x] T006 [P] Add `rootTokenParity` export derived from `colors` in `apps/web/src/theme/tokens.ts` per `specs/072-design-token-regression-tests/data-model.md` root token parity table (no brand test file yet — map only)

**Checkpoint**: Parser utility green; `rootTokenParity` defined in `tokens.ts`; baseline theme suite still passes.

---

## Phase 3: User Story 1 — Brand Palette Stays Stable Across Releases (Priority: P1) 🎯 MVP

**Goal**: `:root` primitive values in `index.css` match canonical `tokens.ts` expected record; required CSS variable names remain present (FR-001, FR-002, SC-001, SC-002).

**Independent Test**: `npm run test:brand` parity and presence describe blocks pass; temporarily changing one `:root` hex fails with token-named message.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Create `apps/web/tests/brand/designTokens.test.ts` with failing `:root` primitive parity loop over `rootTokenParity` using `parseRootCustomProperties(readFileSync('apps/web/src/index.css'))` per `specs/072-design-token-regression-tests/contracts/design-token-regression.md`
- [x] T008 [P] [US1] Add failing `requiredCssVariables` presence assertions in `apps/web/tests/brand/designTokens.test.ts` per VR-001 in `specs/072-design-token-regression-tests/data-model.md`
- [x] T009 [P] [US1] Add failing semantic alias wiring assertions (`--color-text-on-light`, `--color-text-on-dark`, `--color-text-on-accent`, `--color-text-on-accent-disabled`) in `apps/web/tests/brand/designTokens.test.ts` per semantic alias contract in `specs/072-design-token-regression-tests/contracts/design-token-regression.md`

### Implementation for User Story 1

- [x] T010 [US1] Fix any `rootTokenParity` / `colors` drift against `apps/web/src/index.css` `:root` until T007 passes (update `tokens.ts` and/or `index.css` together per single-source-of-truth contract)
- [x] T011 [US1] Ensure Vitest `expect` messages in `apps/web/tests/brand/designTokens.test.ts` include token name, expected, and actual on parity failures (FR-008)

**Checkpoint**: US1 parity and presence tests green via `npm run test -- tests/brand/designTokens.test.ts`.

---

## Phase 4: User Story 2 — Legacy Slate-Blue Colors Do Not Reappear (Priority: P2)

**Goal**: Full `index.css` scan rejects `LEGACY_HEX_DENYLIST` entries including `#1e293b` and `#2563eb` (FR-003, FR-004, SC-003).

**Independent Test**: Introducing `#2563eb` into `index.css` fails `test:brand` with denylist message; clean stylesheet passes.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T012 [P] [US2] Add failing legacy denylist describe block in `apps/web/tests/brand/designTokens.test.ts` importing `LEGACY_HEX_DENYLIST` from `apps/web/src/theme/legacyPalette.ts` (full lowercased `index.css` scan per VR-002)

### Implementation for User Story 2

- [x] T013 [US2] Add optional `LEGACY_HEX_EXCEPTIONS` array (default empty) to `apps/web/src/theme/legacyPalette.ts` and wire exception-aware scan helper used by `apps/web/tests/brand/designTokens.test.ts` per `specs/072-design-token-regression-tests/data-model.md`
- [x] T014 [US2] Add explicit assertions in `apps/web/tests/brand/designTokens.test.ts` that `#1e293b` and `#2563eb` are included in the scanned denylist source (FR-004 minimum coverage)

**Checkpoint**: US2 legacy scan green; negative test with injected hex fails as expected.

---

## Phase 5: User Story 3 — Maintainers Can Update Expectations When Brand Evolves (Priority: P3)

**Goal**: Documented update path and focused npm script so intentional brand changes update one obvious location (FR-007, SC-005).

**Independent Test**: Maintainer follows `quickstart.md` procedure; `test:brand` fails when only `index.css` changes, passes when `tokens.ts` and `index.css` align.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T015 [P] [US3] Add failing `apps/web/tests/brand/packageScript.test.ts` asserting `apps/web/package.json` defines `"test:brand": "vitest run tests/brand"` per npm script contract

### Implementation for User Story 3

- [x] T016 [US3] Add `"test:brand": "vitest run tests/brand"` script to `apps/web/package.json` until T015 passes
- [x] T017 [US3] Add maintainer JSDoc block above `colors` / `rootTokenParity` in `apps/web/src/theme/tokens.ts` linking to update steps in `specs/072-design-token-regression-tests/quickstart.md` § "Updating expected brand values"
- [x] T018 [US3] Manually execute intentional-failure validation from `specs/072-design-token-regression-tests/quickstart.md` § "Validate failure detection" and confirm token-named parity failure before revert

**Checkpoint**: `npm run test:brand` runs focused suite; maintainer doc path verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Deduplicate overlapping theme tests, full regression, coverage gate, quickstart sign-off.

- [x] T019 [P] Remove duplicate core hex parity assertions from `apps/web/tests/theme/cssTokens.test.ts` (retain `:root`/body wiring and selector-specific checks not covered by brand suite) per `specs/072-design-token-regression-tests/research.md` D4
- [x] T020 [P] Remove or thin duplicate denylist scan in `apps/web/tests/theme/legacyPalette.test.ts` — delegate to `apps/web/tests/brand/designTokens.test.ts` or keep single re-export smoke test
- [x] T021 Refactor `apps/web/tests/theme/cssTokens.test.ts` to import `extractRootBlock` from `apps/web/src/theme/parseCssRoot.ts` instead of local duplicate helper
- [x] T022 Run `npm run test:brand` and `npm test` in `apps/web` and resolve any failures (FR-006)
- [x] T023 Run `npm run build` in `apps/web` and confirm production build succeeds
- [x] T024 Verify ≥80.0% line/branch coverage for `apps/web/src/theme/parseCssRoot.ts`, `rootTokenParity` exports in `apps/web/src/theme/tokens.ts`, and `apps/web/tests/brand/` via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A
- [x] T025 Execute SPLR-95 validation checklist in `specs/072-design-token-regression-tests/quickstart.md` (automated gates + negative tests + definition of done)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP scope**
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 brand test file existing (T007 creates `designTokens.test.ts`); may start T012 after T007
- **User Story 3 (Phase 5)**: Depends on Foundational; independent of US2; benefits from US1 brand suite landing first
- **Polish (Phase 6)**: Depends on US1–US3 completion

### User Story Dependencies

| Story | Priority | Depends on | Independent test |
|-------|----------|------------|------------------|
| US1 | P1 | Phase 2 | `npm run test -- tests/brand/designTokens.test.ts` parity + presence |
| US2 | P2 | Phase 2, T007 (brand test file) | Denylist describe in `designTokens.test.ts` |
| US3 | P3 | Phase 2 | `packageScript.test.ts` + `npm run test:brand` |

### Within Each User Story

- Tests (T007–T009, T012, T015) MUST be written and FAIL before implementation tasks in that phase
- Token/CSS changes MUST update `tokens.ts` and `index.css` together (single source of truth)
- Story checkpoint before starting Polish

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001 (after install)
- **Phase 2**: T004 parallel with T003; T006 parallel with T005 after T004 exists
- **Phase 3**: T007 ∥ T008 ∥ T009
- **Phase 4**: T012 after T007; T014 parallel with T013
- **Phase 5**: T015 parallel with late US1/US2 work once `package.json` is free
- **Cross-story**: After T007, US2 denylist tests (T012) can proceed while US1 implementation (T010) runs
- **Polish**: T019 ∥ T020; T021 after T005

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test additions together (after Phase 2):
# T007 parity loop in apps/web/tests/brand/designTokens.test.ts
# T008 requiredCssVariables presence in apps/web/tests/brand/designTokens.test.ts
# T009 semantic alias wiring in apps/web/tests/brand/designTokens.test.ts

cd apps/web
npm run test -- tests/brand/designTokens.test.ts   # expect FAIL until T010
```

---

## Parallel Example: User Story 2

```bash
# After T007 creates brand test file:
# T012 denylist describe in apps/web/tests/brand/designTokens.test.ts
# T014 explicit #1e293b / #2563eb coverage assertions

cd apps/web
npm run test -- tests/brand/designTokens.test.ts   # denylist block must pass on clean index.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (token parity + presence)
4. **STOP and VALIDATE**: `npm run test -- tests/brand/designTokens.test.ts`
5. Optional: merge MVP — CI already runs `npm test` once `test:brand` path exists

### Incremental Delivery

1. Setup + Foundational → parser + `rootTokenParity` ready
2. US1 → `:root` parity guardrails → Validate (MVP)
3. US2 → legacy denylist → Validate
4. US3 → `test:brand` script + maintainer docs → Validate
5. Polish → dedupe theme tests + coverage + quickstart

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. After Phase 2:
   - Developer A: US1 (T007–T011)
   - Developer B: US2 (T012–T014) after T007 lands
   - Developer C: US3 (T015–T018)
3. Merge and run Polish (T019–T025)

---

## Notes

- Do **not** duplicate WCAG contrast ratio logic — keep that in `apps/web/tests/theme/designTokens.test.ts` (SPLR-94)
- Do **not** weaken `hexBudget.test.ts` or `colorMigration.test.ts` migration coverage
- Brand tests MUST use `readFileSync` + `parseCssRoot` only — no jsdom (FR-005)
- Approved brand changes require updating `tokens.ts` **and** `index.css` in the same PR

---

## Task Summary

| Phase | Task IDs | Count |
|-------|----------|-------|
| Setup | T001–T002 | 2 |
| Foundational | T003–T006 | 4 |
| US1 (P1) | T007–T011 | 5 |
| US2 (P2) | T012–T014 | 3 |
| US3 (P3) | T015–T018 | 4 |
| Polish | T019–T025 | 7 |
| **Total** | **T001–T025** | **25** |
