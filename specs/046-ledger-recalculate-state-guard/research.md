# Phase 0 Research: Enforce State Guard on Ledger Recalculate

This document resolves technical decisions for SPLR-34 — closing the audit immutability bypass where `LedgerService.RecalculateAsync` could persist `calculated_net_payout` on frozen events.

## 1. Current code baseline (gap vs partial fix)

- **Decision**: Treat the **service-layer guard** in `LedgerService.RecalculateAsync` (line ~60: `AssertNotSettledOrReconciled(..., FrozenEventMutationOperation.Recalculate)`) as the intended fix, introduced during spec 044 work. SPLR-34 implementation **verifies this guard is present and precedes `RecalculateAndPersistAsync`**, and focuses remaining effort on **test coverage gaps** from the Linear acceptance criteria.
- **Rationale**: Code inspection shows the guard matches other ledger mutation paths (`CreateLineItemAsync`, `UpdateLineItemAsync`, etc.). Re-implementing would be redundant; missing tests were the outstanding SPLR-34 deliverable.
- **Alternatives considered**:
  - **Persistence-layer guard only** — rejected; no `recalculate` operation label; weaker HTTP contract (spec 039).
  - **Move guard into `RecalculateAndPersistAsync`** — rejected; internal callers on editable events (line-item CRUD) legitimately invoke recalculate after their own guards; explicit entry-point guard matches Constitution V.

## 2. Mutation target on frozen events

- **Decision**: The prohibited write is `EventArtist.CalculatedNetPayout` (and any future artist financial fields written in `RecalculateAndPersistAsync`). Tests MUST assert payout values unchanged after rejected recalculate when an artist is present.
- **Rationale**: SPLR-34 explicitly cites `calculated_net_payout` drift; guarantee-only recalculate test without artist does not prove payout immutability.
- **Alternatives considered**:
  - **HTTP 400 assertion only** — rejected; does not prove persistence was blocked.

## 3. Lifecycle coverage matrix

- **Decision**: Integration tests required for:

| Lifecycle | Route | Expected | Audit `Operation` | Payout unchanged |
|-----------|-------|----------|-------------------|------------------|
| `SETTLED` | POST `/recalculate` | 400 | `recalculate` | Yes (when artist seeded) |
| `RECONCILED` | POST `/recalculate` | 400 | `recalculate` | Yes (when artist seeded) |

- **Rationale**: Spec FR-007/FR-008. SETTLED case partially exists (`PostFinalize_Recalculate_Returns400_AndLogsRecalculate_AndPdfUnchanged`); RECONCILED case is **missing**.
- **Alternatives considered**:
  - **SETTLED only** — rejected; Constitution V applies equally to `RECONCILED`.

## 4. Deal-type verification matrix (SPLR-34 acceptance)

- **Decision**: Add parameterized or explicit integration tests finalizing events with artists using each storage deal type:

| Deal type (API) | Storage | Test focus |
|-----------------|---------|------------|
| `"guarantee"` | `guarantee` | Baseline; extend existing test with payout assertion |
| `"door_split"` | `door_split` | Exercises `DealType.DoorSplit` branch in `RecalculateAndPersistAsync` |
| `"custom"` | `custom` | Exercises custom formula branch (e.g. `"net_show_revenue * 0.5"`) |

Each: finalize → POST recalculate → 400 + audit + `CalculatedNetPayout` unchanged + PDF bytes unchanged.

- **Rationale**: Recalculate loops per artist and branches on `DealTypeExtensions.FromStorage`; guard must run **before** the loop so all branches are blocked equally — but tests must prove each branch would have executed deal math if not guarded.
- **Alternatives considered**:
  - **Unit test with mocked `DealMathEngine`** — acceptable supplement; integration tests remain primary per Constitution III.
  - **Single guarantee test** — rejected; fails SPLR-34 acceptance criteria.

## 5. Seeding strategy for deal-type tests

- **Decision**: Extend `IntegrationTestBase` with `SeedFinalizedEventWithArtistDealAsync(client, venueId, token, dealType, ...)` (or overload `SeedFinalizedEventAsync` with `dealType` + optional custom formula) that creates artist **before** lock-budget/settle using the same revenue line-item pattern as `SeedFinalizedEventAsync`.
- **Rationale**: Real finalize pipeline required (spec 044 contract); artist must exist pre-settle so payout is captured in PDF snapshot.
- **Alternatives considered**:
  - **Direct DB artist insert** — rejected; bypasses API validation and deal-type normalization.

## 6. Relationship to spec 044

- **Decision**: Spec 044 added recalculate guard + one SETTLED integration test. Spec 046 **does not duplicate** 044's broader mutation matrix; it **extends** recalculate-specific coverage only (RECONCILED, deal types, payout assertions).
- **Rationale**: Clear ownership: 044 = immutability verification suite breadth; 034/SPLR-34 = recalculate path closure + deal-type proof.
- **Alternatives considered**:
  - **New test file `RecalculateFrozenEventTests`** — acceptable but unnecessary; same base class and assertions already in `SettlementPostFinalizeImmutabilityTests`.

## 7. Frontend scope

- **Decision**: No frontend changes. Recalculate endpoint already returns HTTP 400 via global exception handler; UI error surfacing is out of scope unless a gap is found during implementation.
- **Rationale**: Spec assumptions; backend enforcement is the compliance requirement.

## 8. Regression on editable events

- **Decision**: Retain or add one positive test: `LedgerControllerTests.Recalculate_ReturnsUpdatedGrid` on `PRE_SHOW` event continues to pass (unchanged behavior).
- **Rationale**: FR-004 non-regression requirement.
