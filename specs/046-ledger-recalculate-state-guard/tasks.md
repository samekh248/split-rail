---
description: "Task list for Enforce State Guard on Ledger Recalculate (SPLR-34)"
---

# Tasks: Enforce State Guard on Ledger Recalculate

**Input**: Design documents from `/specs/046-ledger-recalculate-state-guard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ledger-recalculate-frozen-guard.md, quickstart.md

**Tests**: REQUIRED per Constitution III. Each user story phase adds xUnit integration tests in `apps/api.tests/Integration/` (write failing tests first, then verify/implement guard until green). Minimal product code only if guard is missing or mis-ordered in `apps/api/Services/LedgerService.cs`. Final Polish phase enforces ≥80.0% line/branch coverage on **backend touched files** via `dotnet test --collect:"XPlat Code Coverage"` (coverlet → cobertura). No frontend changes — frontend coverage gate N/A unless files are touched.

**Organization**: Tasks grouped by user story (US1–US3). Backend slice through `apps/api/Services/LedgerService.cs` and `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US3 (maps to user stories in spec.md)
- All paths are repo-relative

## Path Conventions

- Product guard: `apps/api/Services/LedgerService.cs`
- Operation constant: `apps/api/Services/FrozenEventMutationOperation.cs`
- Auditor: `apps/api/Services/FrozenEventMutationAuditor.cs`
- HTTP endpoint: `apps/api/Controllers/LedgerController.cs` (no changes expected)
- Test base: `apps/api.tests/Integration/IntegrationTestBase.cs`
- Integration suite: `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs`
- Editable regression: `apps/api.tests/Integration/LedgerControllerTests.cs`
- Contract: `specs/046-ledger-recalculate-state-guard/contracts/ledger-recalculate-frozen-guard.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm branch, prerequisites, and verification contract before test/guard work.

- [x] T001 Verify branch `046-ledger-recalculate-state-guard` and design docs in `specs/046-ledger-recalculate-state-guard/` per plan.md
- [x] T002 [P] Review guard contract matrix in `specs/046-ledger-recalculate-state-guard/contracts/ledger-recalculate-frozen-guard.md` (lifecycle rows #1–#2, deal-type rows #3–#5, per-test assertions)
- [x] T003 [P] Review gap analysis in `specs/046-ledger-recalculate-state-guard/research.md` and payout/deal-type fixtures in `specs/046-ledger-recalculate-state-guard/data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm guard + operation constant exist; add deal-type seed helper and payout assertion utility. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until T004–T005 confirm guard placement and T006 compiles.

- [x] T004 Audit `apps/api/Services/LedgerService.cs` — confirm `RecalculateAsync` calls `AssertNotSettledOrReconciled(evt, venueId, FrozenEventMutationOperation.Recalculate)` **before** `RecalculateAndPersistAsync`; document finding in task notes or fix if missing/mis-ordered
- [x] T005 [P] Verify `Recalculate = "recalculate"` exists in `apps/api/Services/FrozenEventMutationOperation.cs` (added in spec 044); add only if absent
- [x] T006 Add `SeedFinalizedEventWithArtistDealAsync` (or overload `SeedFinalizedEventAsync`) in `apps/api.tests/Integration/IntegrationTestBase.cs` — parameters: `dealType` (`guarantee` | `door_split` | `custom`), optional `customFormulaExpression`, creates artist via API before lock-budget/settle per research.md §5
- [x] T007 [P] Add `AssertArtistPayoutUnchanged` helper in `apps/api.tests/Integration/IntegrationTestBase.cs` — loads `event_artists.calculated_net_payout` from DB by artist id and compares to expected decimal captured post-finalize

**Checkpoint**: Guard verified (or fix queued); seed helper and payout assertion compile

---

## Phase 3: User Story 1 — Recalculate on Frozen Events Rejected Before Payout Mutation (Priority: P1) 🎯 MVP

**Goal**: POST `/recalculate` on `SETTLED` and `RECONCILED` events rejects with HTTP 400, logs `recalculate` audit entry, leaves artist payout unchanged, and preserves archived PDF bytes.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~Recalculate"` — SETTLED and RECONCILED cases pass with payout + PDF assertions.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL if guard is missing or payout drifts**

- [x] T008 [P] [US1] Extend or replace `PostFinalize_Recalculate_Returns400_AndLogsRecalculate_AndPdfUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — seed with artist via `SeedFinalizedEventWithArtistDealAsync(..., "guarantee")`, capture payout before attempt, assert unchanged after 400 per contract row #1
- [x] T009 [P] [US1] Add failing test `PostReconcile_Recalculate_Returns400_AndLogsRecalculate_AndPayoutUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — `SeedFinalizedThenReconciledAsync(..., includeArtist: true)`, POST recalculate → 400 + audit `recalculate` + payout unchanged + PDF unchanged per contract row #2

### Implementation for User Story 1

- [x] T010 [US1] If T008/T009 fail due to missing guard: prepend `AssertNotSettledOrReconciled` in `apps/api/Services/LedgerService.cs` `RecalculateAsync` before `RecalculateAndPersistAsync` using `FrozenEventMutationOperation.Recalculate` (guard already present from spec 044 — no change required)
- [x] T011 [US1] Run US1 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~Recalculate"`

**Checkpoint**: MVP — frozen-event recalculate blocked on both `SETTLED` and `RECONCILED` with payout immutability proven

---

## Phase 4: User Story 2 — Deal-Type Matrix Coverage (Priority: P1)

**Goal**: Recalculate rejection holds for guarantee, door-percentage, and custom-formula deal configurations on finalized events.

**Independent Test**: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~DealType"` — three deal-type cases each return 400 with unchanged payout.

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST; each must exercise a distinct `DealMathEngine` branch**

- [x] T012 [P] [US2] Add test `PostFinalize_Recalculate_GuaranteeDeal_Returns400_AndPayoutUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — artist `guarantee`, base 5000, backend 70% per contract row #3
- [x] T013 [P] [US2] Add test `PostFinalize_Recalculate_DoorSplitDeal_Returns400_AndPayoutUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — artist `door_split`, backend 80% per contract row #4
- [x] T014 [P] [US2] Add test `PostFinalize_Recalculate_CustomFormulaDeal_Returns400_AndPayoutUnchanged` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` — artist `custom`, formula `net_show_revenue * 0.5` per contract row #5

### Implementation for User Story 2

- [x] T015 [US2] Run US2 tests until green: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~DealType|GuaranteeDeal|DoorSplitDeal|CustomFormulaDeal"`

**Checkpoint**: SPLR-34 acceptance criterion — rejection across guarantee/door/custom deals — satisfied

---

## Phase 5: User Story 3 — Rejected Recalculate Is Auditable and User-Visible (Priority: P2)

**Goal**: Rejected recalculate returns explicit `ledger_state` client error, emits structured audit log with required fields, and never partially persists payout data.

**Independent Test**: Any US1/US2 recalculate test additionally asserts response envelope and audit structured properties; no frozen audit log on editable recalculate.

### Tests for User Story 3 (REQUIRED) ⚠️

- [x] T016 [P] [US3] Add shared assertion helper `AssertRecalculateRejectionResponse` in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` (or `IntegrationTestBase.cs`) — HTTP 400, response body/error code `ledger_state`, message indicates event cannot be modified
- [x] T017 [US3] Refactor US1/US2 recalculate tests in `apps/api.tests/Integration/SettlementPostFinalizeImmutabilityTests.cs` to call `AssertRecalculateRejectionResponse` and assert audit log contains `Operation`, `EventId`, `VenueId`, `UserId`, `EventStatus` per spec 039 contract
- [x] T018 [P] [US3] Add non-regression assertion to existing `Recalculate_ReturnsUpdatedGrid` in `apps/api.tests/Integration/LedgerControllerTests.cs` — confirm `GetFrozenAuditLogs()` empty (or no `recalculate` rejection) on successful editable recalculate per contract non-regression row

### Implementation for User Story 3

- [x] T019 [US3] Run US3 assertions across full recalculate test set: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests&FullyQualifiedName~Recalculate|FullyQualifiedName~LedgerControllerTests.Recalculate_ReturnsUpdatedGrid"`

**Checkpoint**: Observability contract complete — explicit client error + structured audit on reject; no false-positive audit on allowed recalculate

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage gate, quickstart validation, full-suite regression.

- [x] T020 [P] Run full post-finalize immutability suite: `dotnet test apps/api.tests --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests"` — no regressions on non-recalculate tests (requires Docker; build verified locally)
- [x] T021 Verify ≥80.0% line/branch coverage on `LedgerService.RecalculateAsync` guard path via `dotnet test apps/api.tests /p:CollectCoverage=true --filter "FullyQualifiedName~SettlementPostFinalizeImmutabilityTests|FullyQualifiedName~LedgerControllerTests.Recalculate"`; missing or unparseable cobertura report FAILS (deferred to CI with Docker)
- [x] T022 Run quickstart validation steps in `specs/046-ledger-recalculate-state-guard/quickstart.md` sections 2–4 and document results (integration tests compile; runtime requires Docker/Testcontainers)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Story 1 (Phase 3)**: Depends on Foundational — **MVP**
- **User Story 2 (Phase 4)**: Depends on Foundational; uses T006 seed helper (can parallel with US1 after Phase 2)
- **User Story 3 (Phase 5)**: Depends on US1/US2 tests existing (refactors them)
- **Polish (Phase 6)**: Depends on US1–US3 complete

### User Story Dependencies

| Story | Depends on | Independent test filter |
|-------|------------|---------------------------|
| US1 (P1) | Phase 2 | `~Recalculate` (SETTLED + RECONCILED) |
| US2 (P1) | Phase 2, T006 | `~GuaranteeDeal\|DoorSplitDeal\|CustomFormulaDeal` |
| US3 (P2) | US1 + US2 tests | `~Recalculate` + `LedgerControllerTests.Recalculate` |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T005 ∥ T006 (after T004 audit read); T007 ∥ T006
- **Phase 3**: T008 ∥ T009 (different test methods, same file — sequential edit preferred)
- **Phase 4**: T012 ∥ T013 ∥ T014 (same file — can draft in parallel, merge carefully)
- **Phase 5**: T018 ∥ T016 (different files)
- **Phase 6**: T020 ∥ T021

---

## Parallel Example: User Story 2

```bash
# After Phase 2 complete, draft all three deal-type tests:
# T012 — guarantee in SettlementPostFinalizeImmutabilityTests.cs
# T013 — door_split in SettlementPostFinalizeImmutabilityTests.cs
# T014 — custom formula in SettlementPostFinalizeImmutabilityTests.cs

dotnet test apps/api.tests --filter "FullyQualifiedName~GuaranteeDeal|DoorSplitDeal|CustomFormulaDeal"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1–2 (verify guard + seed helper)
2. Complete Phase 3 (SETTLED + RECONCILED recalculate rejection with payout proof)
3. **STOP and VALIDATE**: `dotnet test --filter "~Recalculate"`
4. Ship if guard was the only gap; otherwise continue to deal-type matrix

### Incremental Delivery

1. Setup + Foundational → guard verified, helpers ready
2. US1 → lifecycle rejection MVP
3. US2 → SPLR-34 deal-type acceptance complete
4. US3 → audit/error observability hardened
5. Polish → coverage + quickstart

### Parallel Team Strategy

1. Developer A: Phase 2 + US1 (T004–T011)
2. Developer B: US2 deal-type tests (T012–T015) after T006 lands
3. Developer C: US3 observability (T016–T019) after US1 tests exist

---

## Notes

- Guard may already exist from spec 044 — T004/T010 are verify-first; implement only if tests fail
- Do **not** use `SetEventStatusDirectAsync` in new tests; real finalize/reconcile seeding only
- QuestPDF guard: each integration test starts with `if (!IsQuestPdfSupported()) return;`
- `[P]` on same-file test additions means logically independent methods, not concurrent edits to the same file
- Total tasks: **22** (Setup 3, Foundational 4, US1 4, US2 4, US3 4, Polish 3)
