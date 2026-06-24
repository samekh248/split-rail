---
description: "Task list for Consistent Deal-Math Rounding and Custom-Deal Tax feature"
---

# Tasks: Consistent Deal-Math Rounding and Custom-Deal Tax

**Input**: Design documents from `/specs/021-deal-math-rounding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deal-math-rounding.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Every user story phase includes automated test tasks (write first, ensure fail). Final phase includes ≥80.0% coverage gate on backend and frontend independently.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label ([US1]–[US3])

## Path Conventions

- Backend: `apps/api/Services/`, `apps/api.tests/Unit/`
- Frontend: `apps/web/src/lib/`, `apps/web/tests/artists/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites and design artifacts before implementation

- [x] T001 Verify feature branch `021-deal-math-rounding` and review design docs in `specs/021-deal-math-rounding/`
- [x] T002 [P] Confirm existing `DealMathEngine`, `ApplyTaxAndFloor`, and `CustomFormulaEvaluator` in `apps/api/Services/DealMathEngine.cs` and `apps/api/Services/CustomFormulaEvaluator.cs` match plan assumptions (no schema/API changes)
- [x] T003 [P] Confirm existing `dealMathPreview.ts` and `money.ts` helpers in `apps/web/src/lib/dealMathPreview.ts` and `apps/web/src/lib/money.ts`; review golden vectors in `specs/021-deal-math-rounding/contracts/deal-math-rounding.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared `RoundMoney` primitive — MUST complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write failing xUnit test for `RoundMoney` / `.005` away-from-zero boundary (e.g. input producing $100.055 → $100.06) in `apps/api.tests/Unit/DealMathEngineTests.cs`

### Implementation for Foundational

- [x] T005 Add static `RoundMoney(decimal value)` using `Math.Round(value, 2, MidpointRounding.AwayFromZero)` in `apps/api/Services/DealMathEngine.cs`
- [x] T006 Run foundational test until T004 passes: `dotnet test apps/api.tests --filter RoundMoney`

**Checkpoint**: `RoundMoney` exported and tested — user story phases can begin

---

## Phase 3: User Story 1 - Accurate payout when percentages produce fractional cents (Priority: P1) 🎯 MVP

**Goal**: Door-split and guarantee-comparison gross amounts round away-from-zero to two decimal places before tax withholding

**Independent Test**: Door-split artist at 33.33% against net show revenue $1,000.00 with 0% tax → persisted net payout $333.30

### Tests for User Story 1 (REQUIRED) ⚠️

- [x] T007 [P] [US1] Write failing xUnit test for contract vector V1 (33.33% of $1000 net → $333.30) in `apps/api.tests/Unit/DealMathEngineTests.cs`
- [x] T008 [P] [US1] Write failing xUnit test for guarantee round-before-compare (fractional split rounded before `Math.Max` with base guarantee) in `apps/api.tests/Unit/DealMathEngineTests.cs`
- [x] T009 [P] [US1] Write failing xUnit test for contract vector V2 tax midpoint ($100.05 gross, 10% tax → $90.04) via `ApplyTaxAndFloor` in `apps/api.tests/Unit/DealMathEngineTests.cs`
- [x] T010 [P] [US1] Update existing `FractionalSplit_RoundsCorrectly` test in `apps/api.tests/Unit/DealMathEngineTests.cs` to assert intermediate gross rounds to $333.30 before tax (currently may pass unrounded path)

### Implementation for User Story 1

- [x] T011 [US1] Update `CalculateDoorSplitGross` to return `RoundMoney(netShowRevenue * backendPercentage / 100m)` in `apps/api/Services/DealMathEngine.cs`
- [x] T012 [US1] Update `CalculateGuaranteeGross` to `RoundMoney` split amount before `Math.Max(baseGuarantee, roundedSplit)` in `apps/api/Services/DealMathEngine.cs`
- [x] T013 [US1] Run US1 xUnit suite until T007–T010 pass: `dotnet test apps/api.tests --filter DealMathEngine`

**Checkpoint**: User Story 1 complete — intermediate gross rounding for guarantee and door-split deals

---

## Phase 4: User Story 2 - Custom-formula deals follow the same tax rules as standard deals (Priority: P1)

**Goal**: Custom deals route through `ApplyTaxAndFloor` instead of bypassing tax withholding

**Independent Test**: Custom formula gross $1,000.00 with 10% tax → net payout $900.00

### Tests for User Story 2 (REQUIRED) ⚠️

- [x] T014 [P] [US2] Write failing xUnit test for contract vector V3 (custom `GrossRevenue` formula, 10% tax → $900.00) in `apps/api.tests/Unit/DealMathEngineTests.cs`
- [x] T015 [P] [US2] Write failing xUnit test for contract vector V4 cross-type equivalence (guarantee, door_split, custom same gross $5000, 10% tax → $4500.00 each) in `apps/api.tests/Unit/DealMathEngineTests.cs`
- [x] T016 [P] [US2] Write failing xUnit tests for contract vectors V5 (zero/negative net revenue → $0.00) and V6 (negative custom formula → $0.00) in `apps/api.tests/Unit/DealMathEngineTests.cs`

### Implementation for User Story 2

- [x] T017 [US2] Remove custom-deal early return in `CalculateNetPayout`; route all deal types through `ApplyTaxAndFloor(grossArtistPayout, taxWithholdingPercentage)` in `apps/api/Services/DealMathEngine.cs`
- [x] T018 [US2] Run US2 xUnit suite until T014–T016 pass: `dotnet test apps/api.tests --filter DealMathEngine`

**Checkpoint**: User Stories 1 and 2 complete — authoritative backend deal math fully corrected

---

## Phase 5: User Story 3 - Live payout preview matches authoritative calculation (Priority: P2)

**Goal**: `dealMathPreview.ts` mirrors backend intermediate rounding and custom-deal tax rules

**Independent Test**: Door-split preview at fractional percentage matches persisted payout after save

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T019 [P] [US3] Write failing Vitest tests for contract vectors V1–V4 in `apps/web/tests/artists/dealMathPreview.test.ts` (33.33% split, tax midpoint, custom + tax, cross-type equivalence)
- [x] T020 [P] [US3] Write failing Vitest tests for contract vectors V5–V6 (zero/negative net, negative custom formula) in `apps/web/tests/artists/dealMathPreview.test.ts`

### Implementation for User Story 3

- [x] T021 [US3] Round intermediate gross via `roundMoneyAwayFromZero(multiplyMoneyPercent(...))` in `calculateGuaranteeGross` and door-split branch in `apps/web/src/lib/dealMathPreview.ts`
- [x] T022 [US3] Route custom branch through `applyTaxAndFloor(evaluateCustomFormula(...), taxWithholdingPercentage)` instead of returning gross directly in `apps/web/src/lib/dealMathPreview.ts`
- [x] T023 [US3] Run US3 Vitest suite until T019–T020 pass: `cd apps/web && npm run test -- dealMathPreview`

**Checkpoint**: All user stories complete — preview parity with authoritative backend math

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, regression sweep, quickstart validation

- [x] T024 [P] Run full backend unit suite: `dotnet test apps/api.tests/split-rail-api.tests.csproj` — confirm no regressions in `CustomFormulaEvaluatorTests` or ledger integration paths
- [x] T025 [P] Run full frontend artist test suite: `cd apps/web && npm run test -- dealMathPreview artists`
- [x] T026 Verify ≥80.0% line/branch coverage on touched backend files via `dotnet test apps/api.tests /p:CollectCoverage=true`; confirm `DealMathEngine.cs` meets gate; missing or unparseable cobertura FAIL
- [x] T027 Verify ≥80.0% line/branch coverage on touched frontend files via `cd apps/web && npm run test:coverage -- dealMathPreview`; confirm `dealMathPreview.ts` meets gate; missing or unparseable lcov FAIL
- [x] T028 Run manual validation scenarios A–F in `specs/021-deal-math-rounding/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (`RoundMoney`)
- **User Story 2 (Phase 4)**: Depends on US1 (same `DealMathEngine.cs`; intermediate rounding must land before custom tax path change)
- **User Story 3 (Phase 5)**: Depends on US1 + US2 (preview mirrors corrected backend semantics)
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

```text
Phase 2 (RoundMoney)
    └── US1 (intermediate gross rounding — backend)
            └── US2 (custom-deal tax — backend)
                    └── US3 (dealMathPreview parity — frontend)
```

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 3**: T007 ∥ T008 ∥ T009 ∥ T010 (all test files same file but independent test methods — can be written in one pass)
- **Phase 4**: T014 ∥ T015 ∥ T016
- **Phase 5**: T019 ∥ T020
- **Phase 6**: T024 ∥ T025 (after US3)

### Parallel Example: User Story 1

```bash
# Write all US1 failing tests together (T007–T010):
dotnet test apps/api.tests --filter DealMathEngine  # expect failures

# Implement sequentially (same file):
# T011 → T012 → T013
```

### Parallel Example: User Story 3

```bash
# After backend US1+US2 green, frontend can proceed:
# T019–T020: write failing Vitest golden vectors
# T021–T022: implement dealMathPreview.ts changes
# T023: verify pass
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (`RoundMoney`)
3. Complete Phase 3: User Story 1 (backend intermediate rounding)
4. **STOP and VALIDATE**: `dotnet test apps/api.tests --filter DealMathEngine` — V1 and fractional split vectors pass
5. Backend MVP delivers correct door-split and guarantee payouts; preview may still diverge until US3

### Incremental Delivery

1. Setup + Foundational → `RoundMoney` ready
2. US1 → intermediate gross rounding (backend MVP)
3. US2 → custom-deal tax parity (backend complete)
4. US3 → live preview parity (full feature)
5. Polish → coverage + quickstart

### Parallel Team Strategy

With two developers after Foundational:

- **Developer A**: US1 + US2 (backend `DealMathEngine.cs` sequentially)
- **Developer B**: Can draft US3 failing Vitest tests (T019–T020) while A finishes US2; implement T021–T022 after backend vectors are confirmed green

---

## Notes

- No API, DTO, schema, or migration changes — behavior-only fix
- `CustomFormulaEvaluator` unchanged — already rounds formula result to 2dp
- `LedgerService` recalculation path unchanged — inherits corrected math automatically
- Do not use JavaScript `number` in preview money path (Constitution I)
- Settled/reconciled events remain immutable (Constitution V) — no backfill
- `[P]` tasks = different files or independent test methods with no incomplete-task dependencies
- Commit after each task or logical group
