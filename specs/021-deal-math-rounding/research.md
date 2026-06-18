# Research: Consistent Deal-Math Rounding and Custom-Deal Tax

**Feature**: 021-deal-math-rounding | **Date**: 2026-06-18

## R1 — Intermediate rounding boundaries

**Decision**: Introduce a single `RoundMoney(decimal)` helper in `DealMathEngine` and apply it to:
1. Door-split gross: `RoundMoney(netShowRevenue × backend% / 100)` before tax.
2. Guarantee split comparison: `RoundMoney(netShowRevenue × backend% / 100)` **before** `Math.Max(baseGuarantee, roundedSplit)`.

Tax withholding and final payout continue using existing `ApplyTaxAndFloor` (already rounds tax and net).

**Rationale**: Spec FR-001 and User Story 1 acceptance scenario 2 require rounding at intermediate gross boundaries, not only at tax/final steps. Centralizing `RoundMoney` prevents drift between door-split and guarantee paths and matches Constitution I (explicit `MidpointRounding.AwayFromZero`).

**Alternatives considered**:
- Round only the final selected gross once — rejected; leaves unrounded fractional cents flowing into tax calculation on door-split deals (the SPLR-32 gap).
- Round after guarantee `Max()` — rejected; spec explicitly rounds split before comparison; when base guarantee is stored at 2dp, outcomes converge in most cases but comparison semantics differ at tie boundaries.

## R2 — Custom-deal tax withholding

**Decision**: Remove the `if (dealType == DealType.Custom) return Math.Max(0m, grossArtistPayout)` bypass. Route custom deals through `ApplyTaxAndFloor` like guarantee and door-split.

**Rationale**: Original ledger spec FR-010 requires tax withheld once on selected gross regardless of deal type. `CustomFormulaEvaluator` already returns a rounded gross; `ApplyTaxAndFloor` handles tax rounding, net rounding, and $0.00 floor.

**Alternatives considered**:
- Keep custom deals tax-exempt with UI warning — rejected; contradicts spec FR-003 and user expectation.
- Apply tax inside `CustomFormulaEvaluator` — rejected; splits concerns; tax is deal-engine responsibility.

## R3 — Frontend preview parity strategy

**Decision**: Mirror backend changes in `dealMathPreview.ts`:
- `roundMoneyAwayFromZero(multiplyMoneyPercent(...))` on door-split and guarantee split amounts.
- Custom branch: `applyTaxAndFloor(evaluateCustomFormula(...), taxWithholdingPercentage)`.

**Rationale**: Spec FR-007 / SC-004 require preview = persisted payout. Feature 019 established golden-test parity pattern; extend vectors rather than add preview API.

**Alternatives considered**:
- Server-side preview endpoint — rejected; unnecessary latency and API surface for a deterministic math fix.
- Share WASM/C# engine — rejected; over-engineered for two small functions.

## R4 — Custom formula evaluator scope

**Decision**: No changes to `CustomFormulaEvaluator` or NCalc internal step rounding. Formula final result already rounded to 2dp; that rounded value is the custom gross input to `ApplyTaxAndFloor`.

**Rationale**: SPLR-32 scope is DealMathEngine intermediate steps + custom tax bypass. Internal NCalc operation rounding is unchanged since feature 002.

**Alternatives considered**:
- Round at each NCalc operation — rejected; out of spec scope; would change existing formula semantics.

## R5 — Recalculation and settled events

**Decision**: Rely on existing `LedgerService` recalculation triggers (line-item mutation, artist save, explicit recalculate). No one-time backfill migration. Settled/reconciled events remain immutable per Constitution V.

**Rationale**: Spec assumption: corrected values apply on next recalculation; PDF snapshots retain historical values.

**Alternatives considered**:
- Batch SQL backfill of all Pre-Show events — rejected; out of scope; natural recalculation sufficient.

## R6 — Test vectors (canonical)

**Decision**: Document and implement these golden cases in both xUnit and Vitest:

| Case | Inputs | Expected net |
|------|--------|--------------|
| Fractional door split | net=$1000, 33.33%, tax=0% | $333.30 |
| Tax midpoint | gross=$100.05, tax=10% | $90.04 |
| Custom + tax | formula gross=$1000, tax=10% | $900.00 |
| Cross-type equivalence | same gross $5000, tax=10% across guarantee/door/custom | $4500.00 each |
| Zero/negative net | net≤0 | $0.00 |

**Rationale**: Covers SC-001 through SC-004 with concrete, copy-pasteable vectors for dual-stack parity.

**Alternatives considered**:
- Property-based fuzzing only — rejected for v1; golden vectors sufficient and easier to debug.

## R7 — API and schema impact

**Decision**: Zero API/DTO/schema changes. `calculated_net_payout` values may change by pennies on recalculation for affected events.

**Rationale**: Pure behavior fix inside existing calculation pipeline; no new fields or endpoints needed.

**Alternatives considered**:
- Version field on payout algorithm — rejected; unnecessary for penny-level correction.
