---
description: "Task list for Artist Edit Flow with Live Formula Preview feature"
---

# Tasks: Artist Edit Flow with Live Formula Preview

**Input**: Design documents from `/specs/019-artist-formula-preview/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/artist-formula-preview-ui.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3])

## Path Conventions

- Backend: `apps/api/`, `apps/api.tests/`
- Frontend: `apps/web/src/`, `apps/web/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and design artifacts before implementation

- [x] T001 Verify feature branch `019-artist-formula-preview` and review design docs in `specs/019-artist-formula-preview/`
- [x] T002 [P] Confirm `useUpdateArtist`, `UpdateArtistRequest`, and `EventArtistDto.rowVersion` in `apps/web/src/api/ledger.ts` and `apps/web/src/types/generated-api.ts`
- [x] T003 [P] Review UI contract in `specs/019-artist-formula-preview/contracts/artist-formula-preview-ui.md` and form/reorder rules in `specs/019-artist-formula-preview/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Column-aware permission enforcement on artist CRUD — MUST complete before user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing integration test `UpdateArtist_WithoutSettlementPermission_OnLockedBudget_Returns403` in `apps/api.tests/Integration/ArtistDealPermissionTests.cs`

### Implementation for Foundational

- [x] T005 Extract `ValidateArtistStructuralEditAsync` (same rules as line-item structural edit: `canViewFinancials` when unlocked, `canEditSettlement` when locked) in `apps/api/Services/LedgerService.cs` and call from `CreateArtistAsync`, `UpdateArtistAsync`, and `DeleteArtistAsync`
- [x] T006 Run foundational backend test until T004 passes: `dotnet test apps/api.tests/split-rail-api.tests.csproj --filter "FullyQualifiedName~ArtistDealPermission"`
- [x] T007 [P] Confirm `useCanEditLedgerStructure` column-aware hook in `apps/web/src/hooks/useCanEditLedgerStructure.ts` matches clarified FR-012 permission model

**Checkpoint**: Backend artist mutations permission-gated; frontend permission hook confirmed — user story phases can begin

---

## Phase 3: User Story 1 - Edit an existing artist deal (Priority: P1) 🎯 MVP

**Goal**: Shared add/edit bottom form, Edit affordance per artist, save via `PUT /artists/{id}`, cancel/unsaved-switch confirmation, up/down reorder with immediate persist

**Independent Test**: On Pre-Show event, click Edit, change deal fields, save — payout updates and persists; reorder swaps order immediately; unsaved switch shows confirmation

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T008 [P] [US1] Write failing Vitest tests for Edit populates form, Save calls `onUpdateArtist`, and Cancel clears to add mode in `apps/web/tests/artists/ArtistDealPanel.test.tsx`
- [x] T009 [P] [US1] Write failing Vitest test for unsaved-change confirmation when switching Edit target in `apps/web/tests/artists/ArtistDealPanel.test.tsx`
- [x] T010 [P] [US1] Write failing unit tests for `getArtistReorderSwapPair` / `canMoveArtist` in `apps/web/tests/lib/reorderArtists.test.ts`
- [x] T011 [P] [US1] Write failing Vitest tests for up/down reorder calling `onReorderArtist` in `apps/web/tests/artists/ArtistDealPanel.test.tsx`
- [x] T012 [P] [US1] Write failing Vitest test for `useUpdateArtist` + recalculate wiring in `apps/web/tests/pages/EventLedgerPage.test.tsx`

### Implementation for User Story 1

- [x] T013 [P] [US1] Create `getArtistReorderSwapPair` and `canMoveArtist` sorted by `performanceOrder` in `apps/web/src/lib/reorderArtists.ts`
- [x] T014 [US1] Refactor `ArtistDealPanel` to shared add/edit form (`formMode`, `editingArtistId`, `rowVersion`, Edit/Save/Cancel, dirty guard) in `apps/web/src/components/artists/ArtistDealPanel.tsx`
- [x] T015 [US1] Add up/down reorder buttons per artist row gated by `canEditStructure` in `apps/web/src/components/artists/ArtistDealPanel.tsx`
- [x] T016 [US1] Wire `onUpdateArtist` via `useUpdateArtist` + `useRecalculateLedger` and formula 422 error handling in `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T017 [US1] Wire `handleReorderArtist` (two PUT swap + recalculate + error refetch) and pass `canEditStructure` to panel in `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T018 [US1] Run US1 Vitest suites until T008–T012 pass: `npm run test -- tests/artists/ArtistDealPanel.test.tsx tests/lib/reorderArtists.test.ts tests/pages/EventLedgerPage.test.tsx`

**Checkpoint**: User Story 1 fully functional — edit, save, cancel, confirm-on-switch, and immediate reorder work with permission gating

---

## Phase 4: User Story 2 - Live payout preview while configuring a deal (Priority: P1)

**Goal**: Synchronous client-side net-payout preview in shared form updating on deal-input change; validation state for invalid custom formulas

**Independent Test**: Change backend % or formula in add/edit form — `payout-preview` updates within 1s without save; invalid formula shows `payout-preview-error` without misleading amount; saved payout matches preview

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T019 [P] [US2] Write failing golden-vector tests mirroring `CustomFormulaEvaluatorTests` and guarantee/door-split cases in `apps/web/tests/artists/dealMathPreview.test.ts`
- [x] T020 [P] [US2] Write failing Vitest tests for `payout-preview` update on input change and error state for invalid formula in `apps/web/tests/artists/ArtistDealPanel.test.tsx`

### Implementation for User Story 2

- [x] T021 [P] [US2] Add `multiplyMoneyPercent`, `roundMoneyAwayFromZero`, and `maxMoney` helpers (bigint cents, no JS `number` money path) in `apps/web/src/lib/money.ts`
- [x] T022 [US2] Implement `previewNetPayout` mirroring `DealMathEngine` / sanitizer semantics in `apps/web/src/lib/dealMathPreview.ts`
- [x] T023 [US2] Render `payout-preview` / `payout-preview-error` in shared form using `ledger.summary` gross/deduction props in `apps/web/src/components/artists/ArtistDealPanel.tsx`
- [x] T024 [US2] Pass `grossRevenue` and `totalDeductions` from ledger summary into `ArtistDealPanel` in `apps/web/src/pages/EventLedgerPage.tsx`
- [x] T025 [US2] Run US2 Vitest suites until T019–T020 pass: `npm run test -- tests/artists/dealMathPreview.test.ts tests/artists/ArtistDealPanel.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work — edit flow includes live preview matching server math on save

---

## Phase 5: User Story 3 - Insert formula tokens with one click (Priority: P2)

**Goal**: Clickable token buttons insert token names at textarea cursor (or append); disabled when formula editor read-only

**Independent Test**: Place cursor mid-expression, click `GrossRevenue` — token inserted at cursor; preview recalculates when expression valid

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T026 [P] [US3] Write failing Vitest tests for `token-insert-{name}` click at cursor and append-when-unfocused in `apps/web/tests/artists/FormulaEditor.test.tsx`
- [x] T027 [P] [US3] Write failing Vitest test for disabled token buttons when `disabled` prop true in `apps/web/tests/artists/FormulaEditor.test.tsx`

### Implementation for User Story 3

- [x] T028 [US3] Convert token list to `<button type="button" data-testid="token-insert-{name}">` with selection tracking and `insertToken` in `apps/web/src/components/artists/FormulaEditor.tsx`
- [x] T029 [US3] Run US3 Vitest suite until T026–T027 pass: `npm run test -- tests/artists/FormulaEditor.test.tsx`

**Checkpoint**: All user stories independently functional — token insertion accelerates custom-formula authoring

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Styling, manual validation, and coverage gate

- [x] T030 [P] Add artist row action, preview, and token-button styles in `apps/web/src/index.css`
- [x] T031 Run quickstart scenarios A–H documented in `specs/019-artist-formula-preview/quickstart.md`
- [x] T032 Verify ≥80.0% line/branch coverage for new backend and frontend code via `dotnet test apps/api.tests/split-rail-api.tests.csproj` (coverlet → cobertura) and `cd apps/web && npm run test:coverage` (Vitest → lcov); missing or unparseable reports FAIL

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — MVP edit + reorder
- **User Story 2 (Phase 4)**: Depends on US1 shared form existing in `ArtistDealPanel.tsx` (preview integrates into same form)
- **User Story 3 (Phase 5)**: Depends on US1 form rendering `FormulaEditor` (token buttons enhance existing editor)
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependency on US2/US3
- **User Story 2 (P1)**: After US1 form refactor (T014) — preview is form-integrated
- **User Story 3 (P2)**: After US1 — `FormulaEditor` reachable from shared form; can parallel US2 if different developers (different files: `FormulaEditor.tsx` vs `dealMathPreview.ts`)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Libraries (`reorderArtists.ts`, `dealMathPreview.ts`) before panel integration
- Page wiring after panel props stabilize
- Run story test suite before checkpoint

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T004 ∥ T007 (T005 blocks T006)
- **Phase 3 tests**: T008 ∥ T009 ∥ T010 ∥ T011 ∥ T012; T013 ∥ T014 after tests written
- **Phase 4 tests**: T019 ∥ T020; T021 ∥ T022 after tests written
- **Phase 5 tests**: T026 ∥ T027
- **Cross-story**: US2 `dealMathPreview.ts` (T022) can start once T021 lands, parallel to US1 panel polish if form shell exists

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (after Foundational):
npm run test -- tests/artists/ArtistDealPanel.test.tsx  # T008, T009, T011
npm run test -- tests/lib/reorderArtists.test.ts        # T010
npm run test -- tests/pages/EventLedgerPage.test.tsx    # T012

# Parallel implementation (after tests fail):
# T013 reorderArtists.ts  ∥  T014 ArtistDealPanel form refactor (coordinate props)
```

---

## Parallel Example: User Story 2

```bash
# Launch US2 tests together:
npm run test -- tests/artists/dealMathPreview.test.ts   # T019
# T020 extends ArtistDealPanel.test.tsx

# Parallel implementation:
# T021 money.ts helpers  ∥  T022 dealMathPreview.ts (after T021 if helpers required)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (backend permission — CRITICAL)
3. Complete Phase 3: User Story 1 (edit + reorder)
4. **STOP and VALIDATE**: Quickstart scenarios A, D, E, F, G
5. Demo edit/reorder without preview if needed

### Incremental Delivery

1. Setup + Foundational → permission-safe artist mutations
2. User Story 1 → edit + reorder (MVP)
3. User Story 2 → live preview (completes FR-026 gap)
4. User Story 3 → token insertion UX
5. Polish → quickstart + coverage gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Developer A: US1 panel + page wiring
3. Developer B: US2 `dealMathPreview.ts` + golden tests (after T021)
4. Developer C: US3 `FormulaEditor` token buttons (after US1 form exists)

---

## Notes

- Total tasks: **32** (T001–T032)
- Task counts: Setup 3, Foundational 4, US1 11, US2 7, US3 4, Polish 3
- MVP scope: **Phase 1 + 2 + 3** (User Story 1 only — 18 tasks)
- No schema migrations; no new REST routes
- Reorder uses existing `PUT /artists/{id}` twice — no new endpoint
- Commit after each task or logical group; stop at any checkpoint to validate story independently
