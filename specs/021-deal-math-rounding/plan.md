# Implementation Plan: Consistent Deal-Math Rounding and Custom-Deal Tax

**Branch**: `021-deal-math-rounding` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-deal-math-rounding/spec.md` (Linear SPLR-32)

## Summary

Close rounding and tax-parity gaps in the authoritative artist payout engine (`DealMathEngine`) and its client-side mirror (`dealMathPreview.ts`). **Backend**: round door-split and guarantee-comparison gross amounts away-from-zero to two decimal places before tax; route custom-formula deals through the same `ApplyTaxAndFloor` path instead of bypassing tax. **Frontend**: apply identical intermediate rounding and custom-deal tax in `dealMathPreview.ts` so live preview matches persisted payouts (SC-004). **No API, schema, or DTO changes** — behavior-only fix with expanded xUnit + Vitest golden vectors.

## Technical Context

**Language/Version**: C# / .NET 8 (backend `apps/api`); TypeScript 5.7 + React 18 (frontend `apps/web`)

**Primary Dependencies**: Existing `DealMathEngine`, `CustomFormulaEvaluator` (NCalcSync decimal mode); client `money.ts` (`multiplyMoneyPercent`, `roundMoneyAwayFromZero`, `maxMoney`, `subtractMoney`)

**Storage**: PostgreSQL via EF Core 8 — no schema changes; `event_artists.calculated_net_payout` updates on existing recalculation paths only

**Testing**: xUnit unit tests in `DealMathEngineTests.cs` (fractional splits, `.005` boundaries, custom-deal tax, cross-deal-type equivalence); Vitest golden tests in `dealMathPreview.test.ts` mirroring backend vectors; ≥80.0% line/branch coverage enforced independently per stack via CI

**Target Platform**: Linux server (containerized API) + desktop-first SPA (artist deal panel preview)

**Project Type**: Web application (existing two-app monorepo)

**Performance Goals**: Synchronous in-process math — no latency change; preview remains sub-second (spec 019 SC-002)

**Constraints**: `decimal` + `MidpointRounding.AwayFromZero` on server (Constitution I); bigint cents + away-from-zero rounding on client preview (Constitution I); no floating-point; no API contract changes (Constitution VI); settled/reconciled events unchanged (Constitution V); ≥80.0% coverage on touched files; missing/unparseable coverage reports treated as failing

**Scale/Scope**: ~2 modified backend files, ~1 modified frontend file, ~2 extended test files; 0 new REST routes; 0 migrations; 0 new npm/NuGet packages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Server uses `decimal` + explicit `MidpointRounding.AwayFromZero` at every rounded boundary; client preview uses bigint cents only. | PASS |
| II. Multi-Tenant Isolation | No new queries or data access patterns. | N/A |
| III. Engineering Rigor & Quality Gates | xUnit vectors for all rounding/tax paths; Vitest golden parity; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration Boundaries | No QBO interaction. | N/A |
| V. Ledger State Machine & Immutability | Recalculation only on existing mutable paths; settled events excluded by existing guards. | PASS |
| VI. Polyglot Contract & Serialization | No DTO or swagger changes. | PASS |
| VII. EF Core Axioms | No query changes. | N/A |
| VIII. Exception Governance & Logging | Custom formula failures unchanged (`FormulaEvaluationException`). | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/021-deal-math-rounding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── deal-math-rounding.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/api/
└── Services/
    └── DealMathEngine.cs                   # MODIFIED: RoundMoney helper; round intermediate gross;
                                              #           custom deals through ApplyTaxAndFloor

apps/api.tests/
└── Unit/
    └── DealMathEngineTests.cs              # MODIFIED: fractional split, custom tax, equivalence,
                                              #           guarantee round-before-compare vectors

apps/web/src/
└── lib/
    └── dealMathPreview.ts                  # MODIFIED: round intermediate gross; custom tax path

apps/web/tests/
└── artists/
    └── dealMathPreview.test.ts             # MODIFIED: golden vectors mirroring backend fixes
```

**Structure Decision**: Surgical changes to existing deal-math service and its client mirror. `CustomFormulaEvaluator` already rounds formula results — no change unless parity testing reveals a gap. `LedgerService` recalculation path unchanged; it already delegates to `DealMathEngine`.

## Implementation Phases

### Phase A — Backend `DealMathEngine` rounding

1. Add private/static `RoundMoney(decimal value)` → `Math.Round(value, 2, MidpointRounding.AwayFromZero)`.
2. `CalculateDoorSplitGross`: return `RoundMoney(netShowRevenue * backendPercentage / 100m)`.
3. `CalculateGuaranteeGross`: compute split, `RoundMoney(splitAmount)`, then `Math.Max(baseGuarantee, roundedSplit)`.
4. Remove custom-deal early return; all deal types call `ApplyTaxAndFloor(grossArtistPayout, taxWithholdingPercentage)` (custom gross already rounded by `CustomFormulaEvaluator`).
5. Extend `DealMathEngineTests` per [contracts/deal-math-rounding.md](./contracts/deal-math-rounding.md).

### Phase B — Frontend `dealMathPreview` parity

1. Round intermediate gross in `calculateGuaranteeGross` and door-split branch via `roundMoneyAwayFromZero(multiplyMoneyPercent(...))`.
2. Custom branch: evaluate formula → `applyTaxAndFloor(gross, taxWithholdingPercentage)` instead of returning gross directly.
3. Extend `dealMathPreview.test.ts` with matching golden vectors (33.33% case, custom + 10% tax, equivalence).

### Phase C — Verification

1. Run `dotnet test apps/api.tests --filter DealMathEngine`.
2. Run `npm run test -- dealMathPreview` in `apps/web`.
3. Manual quickstart scenarios A–E.
4. Confirm coverage ≥80% on touched files.

## Complexity Tracking

> Not required — no constitution violations.

## Generated Artifacts

| Artifact | Path |
|----------|------|
| Implementation plan | [plan.md](./plan.md) |
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Contract | [contracts/deal-math-rounding.md](./contracts/deal-math-rounding.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
