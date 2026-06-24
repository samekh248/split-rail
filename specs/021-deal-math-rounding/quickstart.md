# Quickstart & Validation: Consistent Deal-Math Rounding and Custom-Deal Tax

**Feature**: 021-deal-math-rounding | **Date**: 2026-06-18

Validates intermediate rounding, custom-deal tax, and preview parity. See [contracts/deal-math-rounding.md](./contracts/deal-math-rounding.md) and [data-model.md](./data-model.md).

## Prerequisites

- .NET 8 SDK, Node 20+
- Features 002 (ledger + DealMathEngine) and 019 (dealMathPreview) implemented
- Local API + web dev server (or test-only validation)

```bash
dotnet test apps/api.tests --filter DealMathEngine
cd apps/web && npm run test -- dealMathPreview
```

## Scenario A — Fractional door split (User Story 1, SC-001)

**Automated**: `DealMathEngineTests` / `dealMathPreview.test.ts` vector V1 (33.33% of $1,000.00 → $333.30).

**Manual** (optional):
1. Open a `PRE_SHOW` event with net show revenue ≈ $1,000 (adjust line items).
2. Add/edit door-split artist at 33.33%, 0% tax.
3. Save and note payout.

**Expected**: Persisted payout = $333.30; live preview matches before save.

## Scenario B — Custom deal tax (User Story 2, SC-002)

**Automated**: Vector V3 ($1,000 gross, 10% tax → $900.00 net).

**Manual** (optional):
1. Add custom-formula artist with formula `GrossRevenue`, 10% tax withholding.
2. Set gross revenue line items totaling $1,000.
3. Save.

**Expected**: Net payout $900.00 (not $1,000.00).

## Scenario C — Tax midpoint boundary (User Story 1, SC-001)

**Automated**: Vector V2 (gross $100.05, 10% tax → $90.04).

**Expected**: Away-from-zero rounding on tax withheld, not banker's rounding.

## Scenario D — Preview parity after save (User Story 3, SC-004)

1. Open add/edit artist form on a `PRE_SHOW` event.
2. Configure door-split at 33.33% with known revenue/deductions.
3. Note live preview amount.
4. Save.

**Expected**: Preview amount equals `calculated_net_payout` in artist list without discrepancy.

## Scenario E — Recalculation updates stale payouts (FR-006)

1. Use an event with a door-split artist at a fractional percentage (pre-fix data if available, or create fresh).
2. Trigger recalculate (edit a line item or explicit recalculate).

**Expected**: Artist payout reflects corrected rounding rules.

## Scenario F — Settled event unchanged (Constitution V)

1. Open a settled event with frozen artist payouts.

**Expected**: No mutation possible; historical payout values unchanged.

## CI verification

```bash
# Backend unit tests
dotnet test apps/api.tests --filter DealMathEngine

# Frontend golden tests
cd apps/web && npm run test -- dealMathPreview

# Coverage on touched files (must be ≥80%)
dotnet test apps/api.tests /p:CollectCoverage=true
cd apps/web && npm run test:coverage -- dealMathPreview
```

## Pass criteria

| ID | Criterion |
|----|-----------|
| SC-001 | All golden vectors V1–V2 pass in xUnit and Vitest |
| SC-002 | Vector V3 passes (custom + tax) |
| SC-003 | Vector V4 passes (cross-type equivalence) |
| SC-004 | Vector V1 + Scenario D (preview = persisted) |
| SC-005 | ≥80% coverage on touched backend and frontend files |
