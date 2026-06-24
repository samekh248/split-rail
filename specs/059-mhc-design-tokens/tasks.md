---
description: "Task list for Montana High Country Design Tokens (SPLR-79, M1)"
---

# Tasks: Montana High Country Design Tokens

**Input**: Design documents from `/specs/059-mhc-design-tokens/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-79 acceptance criteria. Frontend-only (`apps/web`). Component restyling, fonts (SPLR-80), and typography (SPLR-81) are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context and tooling before token work.

- [x] T001 Verify on branch `059-mhc-design-tokens` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review M1 contract delta in `specs/059-mhc-design-tokens/contracts/design-tokens.md` against current `:root` block in `apps/web/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript token mirror and contrast helper baseline used by all story tests. **No user story work can begin until this phase is complete.**

- [x] T003 [P] Update M1 `colors` map and `requiredCssVariables` array in `apps/web/src/theme/tokens.ts` per `specs/059-mhc-design-tokens/contracts/design-tokens.md` (set `accentOrange` to `#E65100`; include semantic variable names)
- [x] T004 [P] Confirm `apps/web/src/theme/contrast.ts` WCAG ratio helper passes existing tests in `apps/web/tests/theme/contrast.test.ts`; extend `contrast.test.ts` only if coverage on `contrast.ts` falls below 80%

**Checkpoint**: Token mirror and contrast utilities ready for contract tests.

---

## Phase 3: User Story 1 — Single Source of Truth for Brand Colors (Priority: P1) 🎯 MVP

**Goal**: Four core Montana High Country color tokens on `:root` with brand-guide hex values (FR-001).

**Independent Test**: Inspect `apps/web/src/index.css` `:root` — named tokens exist for Lodgepole Brown (`#3E2723`), Alpine Sunset (`#E65100`), Canvas Cream (`#F4F1EA`), and Pure White (`#FFFFFF`).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Extend failing core hex assertions in `apps/web/tests/theme/cssTokens.test.ts` to expect `--color-accent-orange: #E65100` per FR-001 (replace `#c45100` expectation)
- [x] T006 [P] [US1] Update `contrastPairings` in `apps/web/src/theme/tokens.ts` and failing assertions in `apps/web/tests/theme/designTokens.test.ts` for white-on-orange at `#E65100` background

### Implementation for User Story 1

- [x] T007 [US1] Set four core color custom properties on `:root` in `apps/web/src/index.css` per `specs/059-mhc-design-tokens/contracts/design-tokens.md` (realign `--color-accent-orange` from `#c45100` to `#E65100`)
- [x] T008 [US1] Sync `colors.accentOrange` to `#E65100` and adjust `accentOrangeHover` derivation in `apps/web/src/theme/tokens.ts` to match updated accent

**Checkpoint**: Core palette tokens are authoritative and test-verified; MVP deliverable for SPLR-79 color foundation.

---

## Phase 4: User Story 2 — Consistent Default Page Appearance (Priority: P2)

**Goal**: `:root` and `body` default to cream background and brown text via `var()` references (FR-003, FR-004).

**Independent Test**: DevTools on `html` and `body` — computed background ≈ `#F4F1EA`, text ≈ `#3E2723`; stylesheet shows `var(--color-bg-cream)` and `var(--color-primary-brown)`, not raw hex.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T009 [P] [US2] Add failing assertions in `apps/web/tests/theme/cssTokens.test.ts` that `:root` `background`/`color` use `var(--color-bg-cream)` and `var(--color-primary-brown)` without raw brand hex

### Implementation for User Story 2

- [x] T010 [US2] Verify and fix `:root` `background`/`color` token wiring in `apps/web/src/index.css` (no hardcoded brand hex at document root)
- [x] T011 [US2] Verify and fix `body` `background`/`color` token wiring in `apps/web/src/index.css` per FR-004

**Checkpoint**: Default page appearance uses token references; brand visible before component theming.

---

## Phase 5: User Story 3 — Semantic Derived Tokens (Priority: P3)

**Goal**: Semantic aliases for text-on-light/dark, subtle borders, button radius, and card shadow (FR-002).

**Independent Test**: `:root` declares `--color-text-on-light`, `--color-text-on-dark`, `--color-border-subtle`, `--radius-button` (4–6px), and `--shadow-card` (`0 2px 5px rgba(0,0,0,0.05)`).

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T012 [P] [US3] Add failing semantic token presence tests in `apps/web/tests/theme/cssTokens.test.ts` for all M1 `requiredCssVariables` from `specs/059-mhc-design-tokens/contracts/design-tokens.md`

### Implementation for User Story 3

- [x] T013 [US3] Add `--color-text-on-light: var(--color-primary-brown)` and `--color-text-on-dark: var(--color-bg-cream)` to `:root` in `apps/web/src/index.css`
- [x] T014 [US3] Align `--shadow-card` to `0 2px 5px rgba(0, 0, 0, 0.05)` and confirm `--color-border-subtle` and `--radius-button: 6px` in `apps/web/src/index.css`
- [x] T015 [US3] Extend `requiredCssVariables` in `apps/web/src/theme/tokens.ts` with `--color-text-on-light`, `--color-text-on-dark`, `--color-border-subtle`, `--radius-button`, and `--shadow-card`

**Checkpoint**: Semantic derived tokens unblock downstream milestones (SPLR-80+).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, coverage gate, and quickstart validation.

- [x] T016 Run `npm test -- tests/theme/cssTokens.test.ts tests/theme/designTokens.test.ts` in `apps/web` and resolve any failures
- [x] T017 Run `npm run build` in `apps/web` per FR-006 and confirm production build succeeds
- [x] T018 Verify ≥80.0% line/branch coverage for `apps/web/src/theme/**` via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T019 Execute M1 validation checklist in `specs/059-mhc-design-tokens/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–5)**: Depend on Foundational completion; execute in priority order P1 → P2 → P3
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3
- **User Story 2 (P2)**: After Foundational — builds on US1 tokens but independently testable via `:root`/`body` assertions
- **User Story 3 (P3)**: After Foundational — uses US1 core tokens for semantic aliases; independently testable via semantic variable presence

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- CSS token changes in `index.css` before syncing `tokens.ts` mirror
- Story checkpoint before advancing priority

### Parallel Opportunities

- **Phase 1**: T002 parallel with T001 (after branch verify)
- **Phase 2**: T003 and T004 in parallel
- **Phase 3**: T005 and T006 in parallel (different test files)
- **Phase 5**: T013 and T014 both touch `index.css` — **sequential**; T015 after T013–T014
- **Polish**: T016–T017 sequential; T018–T019 after tests green

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (from apps/web):
# T005 — cssTokens.test.ts core hex assertions
# T006 — designTokens.test.ts contrast pairings

# Then sequential implementation:
# T007 — index.css core tokens
# T008 — tokens.ts mirror sync
```

---

## Parallel Example: User Story 3

```bash
# T012 — write failing semantic presence tests first

# Sequential CSS (same file):
# T013 — text-on-light / text-on-dark aliases
# T014 — shadow-card / border-subtle / radius-button

# T015 — tokens.ts requiredCssVariables (after CSS stable)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T005–T008)
4. **STOP and VALIDATE**: `npm test -- tests/theme/cssTokens.test.ts tests/theme/designTokens.test.ts`
5. M1 core colors done — unblocks partial downstream work

### Incremental Delivery

1. Setup + Foundational → test utilities ready
2. US1 → four core tokens aligned to brand guide (MVP)
3. US2 → root/body defaults wired to tokens
4. US3 → semantic derived tokens complete SPLR-79 scope
5. Polish → build + coverage + quickstart

### Suggested MVP Scope

**User Story 1 only** (T005–T008) delivers the minimum viable token foundation: four named brand colors with correct hex values and contrast tests. US2 and US3 complete SPLR-79 acceptance criteria.

---

## Notes

- Branch may contain epic work from `058-brand-theming-mhc`; M1 tasks focus on gaps vs `specs/059-mhc-design-tokens/contracts/design-tokens.md` (accent hex, semantic aliases, shadow-card value).
- Do **not** migrate legacy hex in component rules or run `legacyPalette.test.ts` as part of M1 — out of scope per spec assumptions.
- Do **not** add font loading or typography rules — deferred to SPLR-80/SPLR-81.
- `[P]` tasks = different files or read-only review; same-file CSS edits are sequential.
- Commit after each task or logical group.
