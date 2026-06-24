---
description: "Task list for Brand Web Fonts (SPLR-80, M1 typography)"
---

# Tasks: Brand Web Fonts (Zilla Slab + Inter)

**Input**: Design documents from `/specs/060-brand-web-fonts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes Vitest tasks (write tests first, ensure they FAIL before implementation). Final Polish phase includes frontend ≥80.0% coverage gate via `npm run test:coverage` (Vitest → lcov). No backend changes in this feature.

**Organization**: Tasks grouped by user story (US1–US3) aligned with SPLR-80 acceptance criteria. Frontend-only (`apps/web`). Global typography component rules (SPLR-81) are **out of scope**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user stories from spec.md (US1–US3)
- Include exact file paths in every task description

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch context, SPLR-79 color token prerequisite, and contract baseline.

- [x] T001 Verify on branch `060-brand-web-fonts` and install `apps/web` dependencies with `npm install` in `apps/web`
- [x] T002 [P] Review contract delta in `specs/060-brand-web-fonts/contracts/brand-fonts.md` against current `apps/web/src/index.css`, `apps/web/src/theme/tokens.ts`, and `apps/web/src/security/contentSecurityPolicy.ts`
- [x] T003 [P] Confirm SPLR-79 color tokens exist on `:root` in `apps/web/src/index.css` (prerequisite from `059-mhc-design-tokens`; font tokens must be added to the same block)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript font mirror baseline used by typography contract tests. **No user story work can begin until this phase is complete.**

- [x] T004 Update `fonts` map in `apps/web/src/theme/tokens.ts` per `specs/060-brand-web-fonts/contracts/brand-fonts.md` (rename `heading` → `brand`; set full brand-guide fallback stacks for `brand` and `ui`)
- [x] T005 Extend `requiredCssVariables` in `apps/web/src/theme/tokens.ts` to include `--font-brand` and `--font-ui` (remove `--font-heading` if present)

**Checkpoint**: Font token mirror ready for failing contract tests.

---

## Phase 3: User Story 1 — Branded Typography Loads on Every Screen (Priority: P1) 🎯 MVP

**Goal**: Zilla Slab (700) and Inter (400, 500, 700) load via a single Google Fonts `@import` in dev and production (FR-001, FR-005, FR-007).

**Independent Test**: `apps/web/src/index.css` line 1 contains the Google Fonts URL with `Zilla+Slab:wght@700`, `Inter:wght@400;500;700`, and `display=swap`; `apps/web/index.html` has no duplicate `<link rel="stylesheet">` to Google Fonts.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Extend failing Google Fonts URL assertions in `apps/web/tests/theme/typography.test.ts` for `Zilla+Slab:wght@700`, `Inter:wght@400;500;700`, and `display=swap` per `specs/060-brand-web-fonts/contracts/brand-fonts.md`
- [x] T007 [P] [US1] Add failing assertion in `apps/web/tests/theme/typography.test.ts` that `apps/web/index.html` contains no Google Fonts `<link rel="stylesheet">` (preconnect hints allowed)

### Implementation for User Story 1

- [x] T008 [US1] Verify and align `@import url('https://fonts.googleapis.com/css2?...')` as the sole font-loading line at top of `apps/web/src/index.css` per contract (remove any duplicate font `<link>` if added elsewhere)
- [x] T009 [US1] Confirm `preconnect` hints for `fonts.googleapis.com` and `fonts.gstatic.com` remain in `apps/web/index.html` (performance only; no stylesheet link)

**Checkpoint**: Google Fonts import contract satisfied; fonts load in `npm run dev` and `npm run build`.

---

## Phase 4: User Story 2 — Default Interface Text Uses Brand UI Typeface (Priority: P2)

**Goal**: Canonical `--font-brand` and `--font-ui` tokens with brand-guide fallback stacks; default `body` text uses `--font-ui` (FR-002, FR-003, FR-004, FR-006).

**Independent Test**: `:root` declares `--font-brand` and `--font-ui` with full stacks; `body { font-family: var(--font-ui) }`; no `--font-heading` remains; `tokens.ts` mirrors stacks.

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T010 [P] [US2] Replace failing `--font-heading` assertions with `--font-brand` and brand-guide stack expectations in `apps/web/tests/theme/typography.test.ts`
- [x] T011 [P] [US2] Add failing `--font-ui` stack parity assertion against `fonts.ui` in `apps/web/src/theme/tokens.ts` within `apps/web/tests/theme/typography.test.ts`
- [x] T012 [P] [US2] Add failing assertion that `body` uses `font-family: var(--font-ui)` in `apps/web/tests/theme/typography.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] Rename `--font-heading` to `--font-brand` and set full fallback stack on `:root` in `apps/web/src/index.css` per `specs/060-brand-web-fonts/contracts/brand-fonts.md`
- [x] T014 [US2] Set `--font-ui` to `'Inter', 'Open Sans', 'Lato', sans-serif` on `:root` in `apps/web/src/index.css`
- [x] T015 [US2] Replace all `var(--font-heading)` references with `var(--font-brand)` in `apps/web/src/index.css` (heading selectors, auth cards, event cards, etc.)
- [x] T016 [US2] Verify `:root` and `body` both use `font-family: var(--font-ui)` in `apps/web/src/index.css`
- [x] T017 [US2] Sync `fonts.brand`, `fonts.ui`, and `requiredCssVariables` in `apps/web/src/theme/tokens.ts` to match `index.css` declarations

**Checkpoint**: Font tokens authoritative and test-verified; default UI typeface wired.

---

## Phase 5: User Story 3 — Auth Screens Avoid Layout Shift; CSP Permits Fonts (Priority: P3)

**Goal**: Production CSP allowlists Google Fonts domains; dev meta CSP stays in parity; manual auth FOUT check passes (FR-008, FR-009, SC-005).

**Independent Test**: `PRODUCTION_CONTENT_SECURITY_POLICY` and `firebase.json` include `style-src` with `fonts.googleapis.com` and `font-src` with `fonts.gstatic.com`; CSP tests pass; login screen shows no obvious font-related layout shift.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T018 [P] [US3] Extend failing `style-src` and `font-src` assertions in `apps/web/tests/security/contentSecurityPolicy.test.ts` per `specs/060-brand-web-fonts/contracts/brand-fonts.md`
- [x] T019 [P] [US3] Update `contractLiteral` in `apps/web/tests/security/contentSecurityPolicy.test.ts` to include Google Fonts directives and expect `firebase.json` cross-artifact sync

### Implementation for User Story 3

- [x] T020 [US3] Add `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` and `font-src 'self' https://fonts.gstatic.com` to `PRODUCTION_CONTENT_SECURITY_POLICY` in `apps/web/src/security/contentSecurityPolicy.ts`
- [x] T021 [US3] Sync `Content-Security-Policy` header value in `apps/web/firebase.json` to match `PRODUCTION_CONTENT_SECURITY_POLICY`
- [x] T022 [US3] Verify `apps/web/index.html` meta CSP includes equivalent `style-src` and `font-src` entries for local dev parity

**Checkpoint**: Fonts not blocked by production CSP; security tests green.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full test suite, build verification, coverage gate, manual FOUT validation, and quickstart sign-off.

- [x] T023 Run `npm test -- tests/theme/typography.test.ts tests/security/contentSecurityPolicy.test.ts` in `apps/web` and resolve any failures
- [x] T024 Run `npm run build` in `apps/web` per FR-005 and confirm production build succeeds with Google Fonts `@import` intact
- [x] T025 Verify ≥80.0% line/branch coverage for modified `apps/web/src/theme/**` and `apps/web/src/security/**` via `npm run test:coverage` in `apps/web` (Vitest → lcov); backend N/A for this milestone
- [x] T026 Execute manual auth FOUT check on login/registration screens per `specs/060-brand-web-fonts/quickstart.md` §6 (FR-009)
- [x] T027 Execute SPLR-80 validation checklist in `specs/060-brand-web-fonts/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–5)**: Depend on Foundational completion; execute in priority order P1 → P2 → P3
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3; delivers font loading MVP
- **User Story 2 (P2)**: After Foundational — uses US1 `@import` but independently testable via token/body assertions
- **User Story 3 (P3)**: After Foundational — CSP work independent of CSS tokens; recommended after US1 so font loading can be verified end-to-end before manual FOUT check

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- `index.css` token/import changes before `tokens.ts` mirror sync
- CSP constant change before `firebase.json` sync
- Story checkpoint before advancing priority

### Parallel Opportunities

- **Phase 1**: T002 and T003 parallel after T001
- **Phase 2**: T004 then T005 sequential (same file)
- **Phase 3**: T006 and T007 in parallel; T008–T009 sequential (`index.css` then `index.html`)
- **Phase 4**: T010, T011, T012 in parallel (same test file — batch in one edit); T013–T016 sequential (`index.css`); T017 after CSS stable
- **Phase 5**: T018 and T019 in parallel (same test file — batch); T020 then T021 then T022 sequential
- **Polish**: T023–T025 sequential; T026–T027 after tests green

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (from apps/web):
# T006 — typography.test.ts Google Fonts URL weights
# T007 — typography.test.ts no duplicate stylesheet link in index.html

# Then sequential implementation:
# T008 — index.css @import alignment
# T009 — index.html preconnect verification
```

---

## Parallel Example: User Story 2

```bash
# Batch US2 failing tests in typography.test.ts:
# T010 — --font-brand rename + stack
# T011 — --font-ui stack parity
# T012 — body font-family var(--font-ui)

# Sequential CSS (same file):
# T013 — rename token + --font-brand stack
# T014 — --font-ui stack
# T015 — var(--font-brand) reference sweep
# T016 — body/:root font-family verify

# T017 — tokens.ts mirror sync
```

---

## Parallel Example: User Story 3

```bash
# Batch CSP tests:
# T018 — style-src / font-src assertions
# T019 — contractLiteral + firebase.json sync

# Sequential CSP rollout:
# T020 — contentSecurityPolicy.ts
# T021 — firebase.json
# T022 — index.html meta parity
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (T006–T009)
4. **STOP and VALIDATE**: `npm test -- tests/theme/typography.test.ts` + `npm run build`
5. Google Fonts loading done — partial SPLR-80 deliverable

### Incremental Delivery

1. Setup + Foundational → token mirror ready
2. US1 → Google Fonts `@import` contract (MVP)
3. US2 → `--font-brand` / `--font-ui` tokens + body default
4. US3 → production CSP allowlist + manual FOUT check
5. Polish → build + coverage + quickstart

### Suggested MVP Scope

**User Story 1 only** (T006–T009) delivers minimum viable font loading: correct weights, single mechanism, dev/prod build pass. US2 and US3 complete full SPLR-80 acceptance criteria and unblock SPLR-81.

---

## Notes

- Branch may contain partial epic work from `058-brand-theming-mhc` (`@import`, `--font-heading`, incomplete stacks, CSP gap); tasks focus on gaps vs `specs/060-brand-web-fonts/contracts/brand-fonts.md`.
- Do **not** add global typography rules for buttons, tables, or event cards — deferred to SPLR-81.
- Do **not** add a parallel Google Fonts `<link rel="stylesheet">` in `index.html` — violates FR-007.
- `[P]` tasks = different files or read-only review; same-file CSS/test edits should be batched sequentially.
- Commit after each task or logical group.
