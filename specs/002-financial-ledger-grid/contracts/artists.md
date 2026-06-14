# Contract: Artist Deal Configuration

**Feature**: 002-financial-ledger-grid
**Base path**: `api/venues/{venueId}/events/{eventId}/artists`
**Auth**: JWT Bearer. Monetary/percentage fields are JSON strings.

Artist configuration is **only** permitted while `status = PRE_SHOW` (regardless of `is_budget_locked`). Mutations are rejected with **400** otherwise. Successful writes auto-trigger recalculation.

## POST `/artists`

Add an artist deal config.

- **Constraint**: `status = PRE_SHOW`.
- **Request (guarantee)**:

```json
{
  "artistName": "The Headliner",
  "performanceOrder": 1,
  "dealType": "guarantee",
  "baseGuarantee": "5000.00",
  "backendPercentage": "70.00",
  "taxWithholdingPercentage": "0.00"
}
```

- **Request (custom)**:

```json
{
  "artistName": "Co-Headliner",
  "performanceOrder": 2,
  "dealType": "custom",
  "customFormulaExpression": "(GrossRevenue - TotalDeductions) * SplitPercentage - BaseGuarantee",
  "baseGuarantee": "1000.00",
  "backendPercentage": "0.00",
  "taxWithholdingPercentage": "10.00"
}
```

- **201 Created**: created artist DTO incl. `calculatedNetPayout`, `rowVersion`.
- **400 Bad Request**: `status ≠ PRE_SHOW`; invalid `dealType`; `custom` without a formula.
- **422 Unprocessable Entity**: `custom` formula fails sanitize/parse/evaluate (`FormulaEvaluationException`).
- **404 Not Found**: unknown/out-of-tenant event.

## PUT `/artists/{id}`

Update deal config / formula. Requires `rowVersion`.

- **Constraint**: `status = PRE_SHOW`.
- **200 OK**: updated artist DTO with recomputed `calculatedNetPayout` and new `rowVersion`.
- **400 / 422 / 404**: as above.
- **409 Conflict**: stale `rowVersion`.

## DELETE `/artists/{id}`

Remove an artist deal config.

- **Constraint**: `status = PRE_SHOW`.
- **204 No Content**.
- **400 Bad Request**: `status ≠ PRE_SHOW`.
- **404 Not Found**: unknown/out-of-tenant.

## Deal math semantics (server-computed)

Given shared `netShowRevenue = grossRevenue − totalDeductions` (same base for every artist; no ≤100% cap):

| `dealType` | `calculatedNetPayout` |
|------------|------------------------|
| `guarantee` | `gross = max(baseGuarantee, netShowRevenue × backendPercentage/100)`; `payout = Round(gross − Round(gross × tax/100, 2, AwayFromZero), 2, AwayFromZero)`, floored at `0.00` |
| `door_split` | `gross = netShowRevenue × backendPercentage/100`; tax withheld as above; floored at `0.00` |
| `custom` | `Round(evaluate(sanitized formula; tokens GrossRevenue, TotalDeductions, BaseGuarantee, SplitPercentage), 2, AwayFromZero)` |

Custom formula tokens: `GrossRevenue`, `TotalDeductions`, `BaseGuarantee`, `SplitPercentage` (= `backendPercentage / 100`). Allowed characters: `[a-zA-Z0-9\s+\-*/().]`; all others stripped pre-evaluation.
