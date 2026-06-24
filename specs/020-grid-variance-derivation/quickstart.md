# Quickstart & Validation Guide: Client-Side Ledger Variance Derivation

**Feature**: 020-grid-variance-derivation (Linear SPLR-31)

Proves FR-016 client-side variance wiring. References [data-model.md](data-model.md) and [contracts/grid-variance-derivation.md](contracts/grid-variance-derivation.md).

## Prerequisites

- .NET 8 SDK, Node 20+.
- Feature 002 ledger grid implemented (`apps/web` + `apps/api`).
- Local dev stack or Testcontainers-backed API with a seeded org, venue, and event.

## Setup

```bash
# Backend (if not already running)
cd apps/api
dotnet run

# Frontend
cd apps/web
npm install
npm run gen:api
npm run dev
```

## Automated validation (primary)

```bash
cd apps/web
npm run test -- ledgerVariance VarianceCell LedgerGrid
```

**Expected**: All tests pass; `ledgerVariance.test.ts` covers derive, resolve, agreement, mismatch fallback, and parity vectors.

Full suite + coverage:

```bash
npm run test:coverage
```

**Expected**: ≥80% line/branch on touched files (`ledgerVariance.ts`, `VarianceCell.tsx`, `LedgerGrid.tsx`, `LedgerRow.tsx`).

## Manual validation scenarios

Log in as a user with ledger access. Open an event ledger page.

### Scenario A — Zero variance (User Story 1)

1. Open a Pre-Show or Settled event where a row has `settlement = 1000.00` and QBO actual defaults to `0.00`.
2. Inspect the Variance cell for that row.

**Expected**: Displays `-$1,000.00` (QBO actual minus settlement). Cell is **flagged** (non-zero).

### Scenario B — Matching actuals (User Story 1)

1. Use a reconciled event (or test seed) where QBO actual equals settlement on a row.
2. Inspect Variance cell.

**Expected**: `$0.00`, not flagged.

### Scenario C — Client/server agreement (User Story 2)

1. `GET /api/venues/{venueId}/events/{eventId}/ledger` via Swagger or browser network tab.
2. For each row, note `qboActualValue`, `settlementValue`, and `variance`.
3. Compare UI Variance column to `qboActualValue − settlementValue`.

**Expected**: 100% match, zero cent drift (SC-002).

### Scenario D — Settlement edit updates variance (User Story 3)

1. Open Pre-Show event with budget locked and settlement editable.
2. Change a row's settlement value and save (blur/save flow).
3. Observe Variance cell after grid refresh.

**Expected**: Variance reflects new settlement minus unchanged QBO actual.

### Scenario E — Reconciled banner (edge case)

1. Open a `RECONCILED` event with at least one non-zero variance row.
2. Confirm amber/red variance cells and top banner (`data-testid="variance-banner"`).

**Expected**: Banner visible when any row has non-zero **displayed** variance.

## Done criteria

- [ ] `ledgerVariance.ts` derives variance via `subtractMoney` (no JS `number` in money path)
- [ ] `VarianceCell` uses client derivation; server fallback on mismatch
- [ ] `LedgerGrid` banner uses same resolver
- [ ] Vitest suites green; coverage ≥80% on touched frontend files
- [ ] No API or schema changes
- [ ] Manual scenarios A–E pass
