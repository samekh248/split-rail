# Data Model: Consistent Deal-Math Rounding and Custom-Deal Tax

**Feature**: 021-deal-math-rounding | **Date**: 2026-06-18

No new database tables or columns. This document describes the calculation pipeline, rounding boundaries, and persisted fields affected by corrected math. Full entity definitions: [002-financial-ledger-grid/data-model.md](../002-financial-ledger-grid/data-model.md).

## Entity: Event Artist (existing — behavior change only)

| Field | Type | Feature relevance |
|-------|------|-----------------|
| deal_type | ENUM | `guarantee` \| `door_split` \| `custom` — all now share tax path |
| base_guarantee | NUMERIC(12,2) | Pre-tax guarantee; already 2dp at storage |
| backend_percentage | NUMERIC(5,2) | Drives split; intermediate product rounded before use |
| tax_withholding_percentage | NUMERIC(5,2) | Now applied to custom deals (previously bypassed) |
| custom_formula_expression | TEXT | Evaluated to rounded gross, then taxed |
| calculated_net_payout | NUMERIC(12,2) | **Recomputed** on recalculation with corrected rounding |

## Derived: Net show revenue (unchanged)

```
netShowRevenue = grossRevenue − totalDeductions
```

Computed from ledger summary for the active lifecycle column (proforma when budget unlocked, settlement when locked). Not rounded independently — rounding applies at gross-artist-payout boundaries per deal type.

## Calculation pipeline (corrected)

```
┌─────────────────────────────────────────────────────────────────┐
│ netShowRevenue, grossRevenue, totalDeductions, deal config      │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   guarantee            door_split             custom
         │                   │                   │
         │ split = round(    │ gross = round(    │ gross = round(
         │   net × % / 100)  │   net × % / 100)  │   formula eval)
         │ gross = max(      │                   │
         │   base, split)    │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
              ApplyTaxAndFloor(gross, tax%)
              ├─ tax = round(gross × tax% / 100)
              ├─ net = round(gross − tax)
              └─ max(net, 0.00)
                             │
                             ▼
              calculated_net_payout (persisted)
```

### Rounding rule (all boundaries)

Every `round(...)` step: away-from-zero to two decimal places.

## Client mirror: `dealMathPreview` (not persisted)

Same pipeline using bigint-cent string math from `money.ts`. Inputs from form state + `ledger.summary` (gross/deductions). Output `{ payout }` or `{ error }` — must match server `calculated_net_payout` after save.

## State transitions affecting payout

| Trigger | Recalculates payout? | Notes |
|---------|---------------------|-------|
| Line item add/edit/delete | Yes | Existing `LedgerService` path |
| Artist save | Yes | Existing path |
| Explicit recalculate | Yes | `POST .../recalculate` |
| Budget lock / unlock | No direct change | Column switch may change revenue base |
| Settle / reconcile | No | Immutable per Constitution V |

## Validation rules (unchanged)

| Rule | Enforcement |
|------|-------------|
| Custom formula required when `deal_type = custom` | Server + preview |
| Formula parse failure | `FormulaEvaluationException` / preview error |
| Negative net payout | Floored to $0.00 after tax |
