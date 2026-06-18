# Contract: Deal-Math Rounding and Custom-Deal Tax

**Feature**: 021-deal-math-rounding | **Date**: 2026-06-18

Behavioral contract for artist payout description math. No REST API changes — this documents the calculation semantics both stacks MUST implement identically.

## Rounding primitive

```
RoundMoney(value):
  return round(value, 2, AWAY_FROM_ZERO)
```

All monetary outputs that pass through a rounding boundary use `RoundMoney`.

## Door split

```
grossArtistPayout = RoundMoney(netShowRevenue × backendPercentage / 100)
netPayout         = ApplyTaxAndFloor(grossArtistPayout, taxWithholdingPercentage)
```

## Guarantee

```
splitAmount       = RoundMoney(netShowRevenue × backendPercentage / 100)
grossArtistPayout = max(baseGuarantee, splitAmount)
netPayout         = ApplyTaxAndFloor(grossArtistPayout, taxWithholdingPercentage)
```

`baseGuarantee` is already stored at two decimal places; no additional rounding applied when guarantee wins.

## Custom formula

```
grossArtistPayout = RoundMoney(CustomFormulaEvaluator.Evaluate(...))  // evaluator already rounds
netPayout         = ApplyTaxAndFloor(grossArtistPayout, taxWithholdingPercentage)
```

**Breaking change from prior behavior**: custom deals previously returned `max(gross, 0)` without tax. New behavior applies tax like other deal types.

## ApplyTaxAndFloor

```
taxWithheld = RoundMoney(grossArtistPayout × taxWithholdingPercentage / 100)
netBeforeFloor = RoundMoney(grossArtistPayout − taxWithheld)
netPayout = max(netBeforeFloor, 0.00)
```

## Golden test vectors

Both `DealMathEngineTests` and `dealMathPreview.test.ts` MUST assert these cases:

### V1 — Fractional door split (SC-001)

| Field | Value |
|-------|-------|
| deal_type | door_split |
| net_show_revenue | 1000.00 |
| backend_percentage | 33.33 |
| tax_withholding_percentage | 0.00 |
| **expected net_payout** | **333.30** |

Intermediate: gross = RoundMoney(1000 × 33.33 / 100) = 333.30

### V2 — Tax midpoint (SC-001)

| Field | Value |
|-------|-------|
| gross (direct ApplyTaxAndFloor) | 100.05 |
| tax_withholding_percentage | 10.00 |
| **expected net_payout** | **90.04** |

Tax = RoundMoney(10.005) = 10.01; net = RoundMoney(90.04) = 90.04

### V3 — Custom deal with tax (SC-002)

| Field | Value |
|-------|-------|
| deal_type | custom |
| custom_formula | `GrossRevenue` (or any expression yielding 1000.00) |
| gross_revenue | 1000.00 |
| total_deductions | 0.00 |
| tax_withholding_percentage | 10.00 |
| **expected net_payout** | **900.00** |

### V4 — Cross-type equivalence (SC-003)

Given gross artist payout = 5000.00 and tax = 10% for guarantee, door_split, and custom configurations that each produce gross 5000.00:

| deal_type | expected net_payout |
|-----------|---------------------|
| guarantee | 4500.00 |
| door_split | 4500.00 |
| custom | 4500.00 |

### V5 — Zero / negative net revenue

| Field | Value |
|-------|-------|
| net_show_revenue | 0.00 or negative |
| **expected net_payout** | 0.00 |

### V6 — Custom negative formula result

| Field | Value |
|-------|-------|
| deal_type | custom |
| formula result | negative |
| **expected net_payout** | 0.00 |

## Parity requirement (SC-004)

For every vector above, `previewNetPayout(...)` MUST return `{ payout: "<expected>" }` using the same string money format as persisted `calculated_net_payout`.

## Out of scope

- REST request/response shape changes
- Custom formula token set or sanitizer changes
- NCalc internal operation rounding
- Backfill of settled event payouts or PDF snapshots
