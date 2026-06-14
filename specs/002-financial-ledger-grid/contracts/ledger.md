# Contract: Ledger Read & Recalculation

**Feature**: 002-financial-ledger-grid
**Base path**: `api/venues/{venueId}/events/{eventId}`
**Auth**: JWT Bearer (existing). All routes require `[Authorize]`. Org scoping enforced by EF global query filters; venue scoping enforced in `LedgerService`.

> **Serialization rule**: every monetary/percentage field below is a JSON **string** (e.g. `"1234.56"`), produced by `DecimalStringJsonConverter`. Swagger emits these as `type: string`. Frontend consumes generated types only.

## GET `/ledger`

Returns the full grid: line items grouped by block, artists, and per-row computed variance.

- **Permission**: `can_view_financials`
- **200 OK**:

```json
{
  "eventId": "uuid",
  "venueId": "uuid",
  "title": "Friday Headliner",
  "eventDate": "2026-07-04",
  "status": "PRE_SHOW",
  "isBudgetLocked": false,
  "qboTagName": "EVENT-2026-07-04",
  "editability": {
    "proforma": "editable",
    "settlement": "locked",
    "qboActuals": "locked"
  },
  "blocks": [
    {
      "blockType": "REVENUE",
      "rows": [
        {
          "id": "uuid",
          "rowLabel": "GA Tickets",
          "sortOrder": 0,
          "isArtistDeduction": false,
          "proformaValue": "10000.00",
          "settlementValue": "0.00",
          "qboActualValue": "0.00",
          "variance": "0.00",
          "varianceFlagged": false,
          "notes": null,
          "isHiddenFromPromoter": false,
          "rowVersion": "AAAAAAAAB9E="
        }
      ],
      "blockTotals": { "proforma": "10000.00", "settlement": "0.00", "qboActual": "0.00" }
    },
    { "blockType": "EXPENSES", "rows": [], "blockTotals": {} },
    { "blockType": "DEAL_MATH", "rows": [], "blockTotals": {} }
  ],
  "artists": [
    {
      "id": "uuid",
      "artistName": "The Headliner",
      "performanceOrder": 1,
      "dealType": "guarantee",
      "customFormulaExpression": null,
      "baseGuarantee": "5000.00",
      "backendPercentage": "70.00",
      "taxWithholdingPercentage": "0.00",
      "calculatedNetPayout": "5000.00",
      "rowVersion": "AAAAAAAAB9I="
    }
  ],
  "summary": {
    "grossRevenue": "10000.00",
    "totalDeductions": "0.00",
    "netShowRevenue": "10000.00"
  }
}
```

- **403 Forbidden**: lacks `can_view_financials`.
- **404 Not Found**: event does not exist **or** belongs to another organization/out-of-scope venue (cross-tenant requests return 404, not 403, to avoid existence disclosure).

## POST `/recalculate`

Re-aggregates gross/deductions from current line items, runs deal math for every artist, persists `calculated_net_payout`, and returns the full grid snapshot (same shape as `GET /ledger`).

- **Permission**: authenticated (any role that can reach the event); does not require edit permissions.
- **200 OK**: full ledger grid snapshot DTO.
- **404 Not Found**: unknown/out-of-tenant event.

**Notes**:
- Recalculation also runs automatically after any successful line-item or artist mutation (see other contracts).
- The active column for aggregation is `proforma_value` while `is_budget_locked = false`, else `settlement_value`.
- `FormulaEvaluationException` from a `custom` artist surfaces as **422 Unprocessable Entity** with the offending artist id and a sanitized error message (no stack/secret leakage).
