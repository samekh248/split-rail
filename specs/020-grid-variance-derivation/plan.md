# Implementation Plan: Client-Side Ledger Variance Derivation

**Branch**: `020-grid-variance-derivation` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-grid-variance-derivation/spec.md` (Linear SPLR-31)

## Summary

Close the FR-016 gap: the ledger grid currently renders server-supplied `row.variance` in `VarianceCell` without client-side derivation. Add a small `ledgerVariance.ts` module that derives variance via existing `subtractMoney` (BigInt cents), resolves display with server fallback on mismatch, and wire it through `VarianceCell`, `LedgerRow`, and `LedgerGrid` (reconciled banner). **No backend or API changes** — server `LedgerService.ToLineItemDto` already computes variance in `decimal`.

## Technical Context

**Language/Version**: C# / .NET 8 (backend `apps/api` — unchanged); TypeScript 5.7 + React 18 (frontend `apps/web`)

**Primary Dependencies**: Existing `money.ts` (`subtractMoney`, `isNonZeroVariance`, `compareMoney`, `normalizeMoney`); TanStack Query ledger fetch in `EventLedgerPage`; Vitest + React Testing Library

**Storage**: PostgreSQL via EF Core 8 — no schema changes

**Testing**: Vitest for `ledgerVariance.ts`, `VarianceCell`, `LedgerGrid` banner; extend existing ledger component tests; ≥80.0% line/branch coverage enforced independently per stack via CI (backend: no new code — existing ledger integration tests suffice)

**Target Platform**: Linux server (containerized API) + desktop-first SPA (event ledger page)

**Project Type**: Web application (existing two-app monorepo)

**Performance Goals**: Synchronous per-row derivation on render — negligible vs grid paint; no network round-trips added

**Constraints**: No floating-point money on client path — `subtractMoney` BigInt cents only (Constitution I); types from `generated-api.ts` only (Constitution VI); variance read-only (FR-008); server variance authoritative on mismatch (FR-003); highlighting follows displayed variance; ≥80.0% coverage on touched frontend files; missing/unparseable coverage reports treated as failing

**Scale/Scope**: ~4 modified frontend files, 1 new lib module, 1 new test file, ~2 extended test files; 0 backend changes; 0 new REST routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|-----------|-----------|--------|
| I. Core Mathematical Axioms | Client uses `subtractMoney` (bigint cents); server unchanged (`decimal`). | PASS |
| II. Multi-Tenant Isolation | No new queries or data access. | N/A |
| III. Engineering Rigor & Quality Gates | Vitest unit + component tests for derivation and grid wiring; ≥80% on touched files. | PASS (with tests) |
| IV. QBO Integration Boundaries | QBO actuals remain read-only; no QBO mutations. | N/A |
| V. Ledger State Machine & Immutability | No mutations; display-only variance. | PASS |
| VI. Polyglot Contract & Serialization | Uses `LineItemDto` from `generated-api.ts`; no hand-written API mirrors. | PASS |
| VII. EF Core Axioms | No backend query changes. | N/A |
| VIII. Exception Governance & Logging | Invalid money strings throw from `money.ts` (existing behavior). | PASS |

**Post-design re-check**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/020-grid-variance-derivation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── grid-variance-derivation.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── money.ts                            # EXISTING: subtractMoney, isNonZeroVariance
│   └── ledgerVariance.ts                   # NEW: deriveVariance, resolveVarianceDisplay
└── components/ledger/
    ├── VarianceCell.tsx                    # MODIFIED: accept qbo/settlement/serverVariance; derive display
    ├── LedgerRow.tsx                       # MODIFIED: pass row monetary fields to VarianceCell
    └── LedgerGrid.tsx                      # MODIFIED: banner uses resolveVarianceDisplay per row

apps/web/tests/
├── lib/
│   └── ledgerVariance.test.ts              # NEW: derive, resolve, parity, mismatch fallback
└── ledger/
    ├── VarianceCell.test.tsx               # MODIFIED: derivation from qbo/settlement props
    └── LedgerGrid.test.tsx                 # MODIFIED: banner uses derived flags
```

**Structure Decision**: Frontend-only change in existing `apps/web` ledger components. Backend `LedgerService.ToLineItemDto` left unchanged.

## Implementation Phases

### Phase A — `ledgerVariance` module

1. Add `deriveVariance(qboActual, settlement)` — null-safe normalize → `subtractMoney`.
2. Add `resolveVarianceDisplay({ qboActual, settlement, serverVariance })` per [contracts/grid-variance-derivation.md](./contracts/grid-variance-derivation.md).
3. Unit tests with parity vectors and intentional mismatch (server wins display + flag).

### Phase B — Wire `VarianceCell` and `LedgerRow`

1. Change `VarianceCell` props to `qboActual`, `settlement`, `serverVariance`.
2. Call `resolveVarianceDisplay` inside cell; render `formatMoney(displayVariance)` and `flagged` class.
3. Update `LedgerRow` to pass `row.qboActualValue`, `row.settlementValue`, `row.variance`.
4. Extend `VarianceCell.test.tsx` for derived display (zero, negative, boundary `0.01`).

### Phase C — `LedgerGrid` banner alignment

1. Replace `row.varianceFlagged` scan with `resolveVarianceDisplay(...).flagged`.
2. Extend `LedgerGrid.test.tsx` — banner when derived variance non-zero on reconciled ledger.

### Phase D — Verification

1. Run `npm run test -- ledgerVariance VarianceCell LedgerGrid` in `apps/web`.
2. Run coverage on touched files; confirm ≥80%.
3. Manual quickstart scenarios A–E.

## Complexity Tracking

> Not required — no constitution violations.

## Generated Artifacts

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Contract | [contracts/grid-variance-derivation.md](./contracts/grid-variance-derivation.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
