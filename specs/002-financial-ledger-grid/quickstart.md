# Quickstart & Validation Guide: Core Financial Ledger Grid

**Feature**: 002-financial-ledger-grid

This guide proves the feature end-to-end. It references [data-model.md](data-model.md) and [contracts/](contracts/) for shapes; it does not duplicate implementation code.

## Prerequisites

- .NET 8 SDK, Node 20+, Docker (for Testcontainers).
- The 001 tenant/RBAC foundation present (`organizations`, `venues`, `users`, `organization_roles`, JWT auth).
- A seeded organization with an Admin user (has `can_view_financials`, `can_lock_budget`, `can_edit_settlement`) and at least one venue.
- `NCalcSync` package added to `apps/api`.

## Setup

```bash
# Backend
cd apps/api
dotnet add package NCalcSync
dotnet ef migrations add AddFinancialLedgerEntities
dotnet ef database update          # against local/Testcontainers PostgreSQL
dotnet run                         # Swagger at /swagger

# Frontend (new app)
cd ../web
npm install
npm run gen:api                    # openapi-typescript -> src/types/generated-api.ts
npm run dev
```

## Validation Scenarios

Acquire a JWT via the existing `POST api/auth/login`, then set `Authorization: Bearer <token>`. Replace `{venueId}`/`{eventId}` accordingly.

### Scenario A — Build a budget with deal math (User Story 1, P1)

1. Ensure an event exists in `PRE_SHOW`, `is_budget_locked = false`.
2. `POST …/line-items` a REVENUE row `proformaValue = "10000.00"`.
3. `POST …/line-items` an EXPENSES row `isArtistDeduction = true`, `proformaValue = "2000.00"`.
4. `POST …/artists` a `door_split` artist `backendPercentage = "50.00"`, `taxWithholdingPercentage = "10.00"`.
5. `GET …/ledger`.

**Expected**: `summary.netShowRevenue = "8000.00"`; artist gross = `8000 × 50% = 4000.00`; tax = `Round(400.00) = 400.00`; `calculatedNetPayout = "3600.00"`. Rows grouped under REVENUE/EXPENSES/DEAL_MATH with block totals.

### Scenario B — Guarantee floor & pre-tax comparison (Clarification Q1)

1. With `netShowRevenue = 8000.00`, configure a `guarantee` artist: `baseGuarantee = "5000.00"`, `backendPercentage = "40.00"` (door result `3200.00`), `taxWithholdingPercentage = "10.00"`.
2. `POST …/recalculate`.

**Expected**: gross = `max(5000.00, 3200.00) = 5000.00`; tax = `500.00`; `calculatedNetPayout = "4500.00"`. (Comparison done pre-tax; tax applied once to the selected gross.)

### Scenario C — Lock budget gates editability (User Story 2, P2)

1. `POST …/lock-budget` as a user with `can_lock_budget`.
2. `GET …/ledger` → `editability.proforma = "read-only"`, `editability.settlement = "editable"`.
3. `PUT …/line-items/{id}` changing `proformaValue` → **400** (`LedgerStateException` / not editable).
4. `PUT …/line-items/{id}` changing `settlementValue` as a user with `can_edit_settlement` → **200**; payouts recalc from settlement column.
5. Repeat step 1 as a user without `can_lock_budget` → **403**.

### Scenario D — Variance & QBO actuals (User Story 3, P3)

1. With a settlement value set and `qboActualValue` defaulting to `"0.00"`, `GET …/ledger`.

**Expected**: each row `variance = qboActual − settlement`; rows with non-zero variance have `varianceFlagged = true`. No endpoint accepts manual `qboActualValue` writes (read-only).

### Scenario E — Custom formula & injection safety (User Story 4, P4)

1. `POST …/artists` `dealType = "custom"`, `customFormulaExpression = "(GrossRevenue - TotalDeductions) * SplitPercentage"`, `backendPercentage = "25.00"`.
2. `POST …/recalculate` → `calculatedNetPayout` equals `netShowRevenue × 0.25`, rounded away-from-zero.
3. `PUT …/artists/{id}` with a malicious formula (e.g. containing `;`, `System`, backticks) → sanitizer strips non-math chars; either evaluates the cleaned expression or returns **422** with a safe message. No code execution, no secret leakage.

### Scenario F — Tenant isolation & concurrency

1. As a user from **Organization B**, call any `…/events/{eventId}/…` route for an event owned by **Organization A** → **404** (not 403).
2. Two clients `GET` the same line item, both `PUT` with the same `rowVersion`; the second → **409 Conflict**.

## Automated Test Coverage (maps to spec)

- **Unit (`DealMathEngine`)**: 33.33% of $1000.00; `.005` rounding boundary (AwayFromZero); zero gross; deductions > gross (payout floors at 0); multi-artist mixed deal types; guarantee pre-tax comparison.
- **Unit (`CustomFormulaEvaluator`)**: nested parentheses; injection attempt (non-math chars stripped); parse/eval failure throws `FormulaEvaluationException`.
- **Integration**: CRUD scoped to org (cross-tenant → 404); state machine (no proforma edit after lock; no edits after `SETTLED`); recalculate updates all payouts; optimistic concurrency 409.
- **OpenAPI**: build API → confirm Swagger emits decimal fields as `string`; run `openapi-typescript` → `apps/web` compiles against generated types with no hand-written duplicates.
- **Frontend (Vitest + RTL)**: grid renders 3 blocks × 5 columns; cells disabled per state/permission; variance highlight on non-zero; artist panel live payout preview.

## Done Criteria

All scenarios A–F pass, unit/integration/frontend suites green, coverage ≥80%, Swagger decimal-as-string verified, and `apps/web` builds against generated types.

## Validation Results (2026-06-14)

| Check | Result |
|-------|--------|
| Backend unit tests (`DealMathEngine`, `CustomFormulaEvaluator`) | 69/69 xUnit tests pass |
| Backend integration tests (ledger CRUD, state machine, tenant isolation, concurrency) | Included above |
| Frontend Vitest + RTL (grid, editability, variance, formula editor) | 19/19 tests pass |
| Scenarios A–F | Covered by automated tests mapping to quickstart scenarios |
| `npm run build` (apps/web) | Pass |
| `npm run gen:api` | Script ready; run against live Swagger after `dotnet run` |

**Note**: Run `dotnet ef database update` locally after pulling. Hand-written migrations include `[Migration(...)]` attributes required for EF discovery.
