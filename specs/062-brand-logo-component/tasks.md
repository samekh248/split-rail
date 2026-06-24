---
description: "Task list for Brand Logo Component (SPLR-83, M2 navigation branding)"
---

# Tasks: Brand Logo Component (Text & Badge Variants)

**Input**: Design documents from `/specs/062-brand-logo-component/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest + React Testing Library tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-83 acceptance criteria. Frontend-only (`apps/web`). Navigation shell wiring (SPLR-84) and `auth` logo variant are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, contract baseline, and SPLR-82 asset prerequisite.

- [x] T001 Verify on branch `062-brand-logo-component` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/062-brand-logo-component/contracts/brand-logo.md` against current `apps/web/src/components/brand/BrandLogo.tsx`, `apps/web/src/brand/assets.ts`, `apps/web/src/index.css`, and `apps/web/tests/theme/BrandLogo.test.tsx`
- [x] T003 [P] Confirm `apps/web/public/brand/` directory exists and documents SPLR-82 dependency for `sr-text.png` and `sr-badge.png` per `specs/062-brand-logo-component/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Centralized asset registry and logo PNG files. **No user story work can begin until this phase is complete.**

- [x] T004 Add `BRAND_LOGO_TEXT` and `BRAND_LOGO_BADGE` path constants in `apps/web/src/brand/assets.ts` per `specs/062-brand-logo-component/contracts/brand-logo.md`
- [x] T005 [P] Add `sr-text.png` and `sr-badge.png` logo assets to `apps/web/public/brand/` (SPLR-82; transparent PNG backgrounds)
- [x] T006 Create `apps/web/src/components/brand/` and `apps/web/tests/theme/` directory scaffold if missing per `specs/062-brand-logo-component/plan.md`

**Checkpoint**: Asset registry and public logo files ready for component implementation.

---

## Phase 3: User Story 1 — Full Wordmark When Navigation Has Room (Priority: P1) 🎯 MVP

**Goal**: Wordmark (`text`) variant renders centered with ≥24px padding and accessible default `alt` (FR-002, FR-005, FR-007).

**Independent Test**: Render `<BrandLogo variant="text" />` in isolation; `img` has `src="/brand/sr-text.png"`, class `brand-logo--text`, and accessible name `Split-Rail`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Write failing text variant test (`src` → `/brand/sr-text.png`, class `brand-logo--text`) in `apps/web/tests/theme/BrandLogo.test.tsx` per `specs/062-brand-logo-component/contracts/brand-logo.md`
- [x] T008 [P] [US1] Write failing default `alt="Split-Rail"` assertion for text variant in `apps/web/tests/theme/BrandLogo.test.tsx`
- [x] T009 [P] [US1] Write failing custom `alt` prop assertion in `apps/web/tests/theme/BrandLogo.test.tsx`

### Implementation for User Story 1

- [x] T010 [US1] Implement `BrandLogo` component with `variant: 'text'` support, wrapper `brand-logo-wrapper`, and default `alt="Split-Rail"` in `apps/web/src/components/brand/BrandLogo.tsx` importing `BRAND_LOGO_TEXT` from `apps/web/src/brand/assets.ts`
- [x] T011 [US1] Add `.brand-logo-wrapper` (flex center, `padding: 1.5rem`) and `.brand-logo--text` (`max-height: 2.5rem`) rules in `apps/web/src/index.css` per contract
- [x] T012 [US1] Run `npm test -- tests/theme/BrandLogo.test.tsx` in `apps/web` and confirm T007–T009 pass

**Checkpoint**: Wordmark variant fully testable in isolation — MVP deliverable for SPLR-83.

---

## Phase 4: User Story 2 — Compact Badge When Navigation Is Minimized (Priority: P1)

**Goal**: Badge (`badge`) variant renders centered within collapsed-rail width constraints; wrapper slot prevents layout shift (FR-003, FR-004, FR-006).

**Independent Test**: Render `<BrandLogo variant="badge" />` in isolation; `img` has `src="/brand/sr-badge.png"`, class `brand-logo--badge`, fixed compact dimensions via CSS.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T013 [P] [US2] Write failing badge variant test (`src` → `/brand/sr-badge.png`, class `brand-logo--badge`) in `apps/web/tests/theme/BrandLogo.test.tsx`
- [x] T014 [P] [US2] Write failing wrapper `className` merge assertion (`.brand-logo-wrapper.custom-wrapper`) in `apps/web/tests/theme/BrandLogo.test.tsx`

### Implementation for User Story 2

- [x] T015 [US2] Extend `BrandLogo` to support `variant: 'badge'` mapping to `BRAND_LOGO_BADGE` in `apps/web/src/components/brand/BrandLogo.tsx` (make T013–T014 pass)
- [x] T016 [US2] Add `.brand-logo--badge` sizing rules (`width`/`height` `2.5rem`, `object-fit: contain`) in `apps/web/src/index.css` per contract
- [x] T017 [US2] Run `npm test -- tests/theme/BrandLogo.test.tsx` in `apps/web` and confirm all US1 + US2 cases pass

**Checkpoint**: Both `text` and `badge` variants independently verifiable; ready for SPLR-84 wiring.

---

## Phase 5: User Story 3 — Consistent, Maintainable Brand Asset References (Priority: P2)

**Goal**: Logo image paths defined only in `assets.ts`; no duplicate hardcoded `/brand/` strings elsewhere (FR-009, SC-005).

**Independent Test**: Automated test passes; ripgrep finds `/brand/sr-` only in `apps/web/src/brand/assets.ts`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T018 [P] [US3] Write failing brand path centralization test scanning `apps/web/src/**` for `/brand/sr-` literals outside `apps/web/src/brand/assets.ts` in `apps/web/tests/theme/brandAssets.test.ts`

### Implementation for User Story 3

- [x] T019 [US3] Remove any hardcoded `/brand/sr-text.png` or `/brand/sr-badge.png` strings from `apps/web/src/components/brand/BrandLogo.tsx` and other `apps/web/src/**` files; use `apps/web/src/brand/assets.ts` constants only
- [x] T020 [US3] Run `npm test -- tests/theme/brandAssets.test.ts` in `apps/web` and confirm path centralization passes

**Checkpoint**: Single source of truth for logo paths; FR-009 satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, and quickstart sign-off.

- [x] T021 Run `npm test -- tests/theme/BrandLogo.test.tsx tests/theme/brandAssets.test.ts` in `apps/web` and resolve any failures
- [x] T022 Run `npm run build` in `apps/web` and confirm production build succeeds with logo assets in `apps/web/public/brand/`
- [x] T023 Verify ≥80.0% line/branch coverage for `apps/web/src/components/brand/BrandLogo.tsx` via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T024 Execute SPLR-83 validation checklist in `specs/062-brand-logo-component/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–5)**: Depend on Foundational completion; US1 and US2 are both P1 — execute US1 first (MVP), then US2; US3 after US1+US2
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3; delivers wordmark MVP
- **User Story 2 (P1)**: After Foundational — extends same `BrandLogo.tsx` with badge variant; independently testable via badge-specific assertions
- **User Story 3 (P2)**: After US1 + US2 — audits path centralization across `apps/web/src/**`

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- `assets.ts` and PNG files before component work (Foundational)
- CSS variant rules after component variant mapping in same story
- Story checkpoint before advancing priority

### Parallel Opportunities

- **Phase 1**: T002 and T003 parallel after T001
- **Phase 2**: T005 parallel with T004 (different paths); T006 parallel with T004/T005 if directories missing
- **Phase 3**: T007, T008, T009 in parallel (same test file — batch in one edit); T010 then T011 sequential
- **Phase 4**: T013 and T014 in parallel (same test file — batch); T015 then T016 sequential
- **Phase 5**: T018 standalone; T019 then T020 sequential
- **Polish**: T021 → T022 → T023 → T024 sequential

---

## Parallel Example: User Story 1

```bash
# Batch US1 failing tests in BrandLogo.test.tsx (from apps/web):
# T007 — text variant src + class
# T008 — default alt
# T009 — custom alt

# Sequential implementation:
# T010 — BrandLogo.tsx text variant
# T011 — index.css wrapper + text styles
# T012 — npm test BrandLogo.test.tsx
```

---

## Parallel Example: User Story 2

```bash
# Batch US2 failing tests in BrandLogo.test.tsx:
# T013 — badge variant src + class
# T014 — className on wrapper

# Sequential implementation:
# T015 — BrandLogo.tsx badge variant
# T016 — index.css badge styles
# T017 — npm test BrandLogo.test.tsx (all cases)
```

---

## Parallel Example: User Story 3

```bash
# T018 — brandAssets.test.ts path scan (write failing first)

# T019 — remove hardcoded paths from src/**
# T020 — npm test brandAssets.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T007–T012)
4. **STOP and VALIDATE**: `npm test -- tests/theme/BrandLogo.test.tsx` (text + alt cases)
5. Wordmark component done — partial SPLR-83 deliverable

### Incremental Delivery

1. Setup + Foundational → assets registry + PNG files ready
2. US1 → wordmark variant + padding + accessibility (MVP)
3. US2 → badge variant + compact sizing + className hook
4. US3 → path centralization regression test
5. Polish → build + coverage + quickstart

### Suggested MVP Scope

**User Story 1 only** (T007–T012) delivers minimum viable `BrandLogo` with wordmark rendering. US2 completes badge support for full SPLR-83 variant coverage. US3 adds maintainability gate. SPLR-84 wires the component into navigation shell separately.

### Reconciliation Note

Branch may already contain implementation from `058-brand-theming-mhc` (`BrandLogo.tsx`, `assets.ts`, CSS, tests). Execute tasks as **verify-then-gap-fill**: run tests first; mark tasks complete when contract is satisfied; only edit files when assertions fail.

---

## Notes

- Do **not** wire `BrandLogo` into `SidebarRail`, `TopBar`, `MobileNavDrawer`, or `DashboardHome` — deferred to SPLR-84.
- Do **not** remove or require `auth` variant changes — out of SPLR-83 scope per spec Assumptions.
- Keep tests in `apps/web/tests/theme/BrandLogo.test.tsx` (not `tests/components/brand/` per research D4).
- `[P]` tasks = different files or read-only review; same-file test/CSS edits should be batched sequentially.
- Commit after each task or logical group.
