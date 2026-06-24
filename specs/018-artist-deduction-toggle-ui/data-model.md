# Data Model: Artist Deduction Toggle on Expense Rows

**Feature**: 018-artist-deduction-toggle-ui | **Date**: 2026-06-17

No new database tables or columns. This document describes the existing `is_artist_deduction` field and client-side presentation rules. Full entity definition: [002-financial-ledger-grid/data-model.md](../002-financial-ledger-grid/data-model.md).

## Entity: Financial Line Item (existing)

| Field | Type | Deduction feature relevance |
|-------|------|----------------------------|
| id | UUID | Row identity for toggle `PUT` |
| block_type | VARCHAR | Toggle UI only on `EXPENSES` rows |
| is_artist_deduction | BOOL | When true, row's active value contributes to `totalDeductions` before artist splits |
| proforma_value | NUMERIC(12,2) | Active value when budget unlocked |
| settlement_value | NUMERIC(12,2) | Active value when budget locked |
| row_version | concurrency token | Required on every flag toggle `PUT` |

## Derived: Active value (server)

| Budget locked | Active value source |
|---------------|---------------------|
| false | `proforma_value` |
| true | `settlement_value` |

Used in `ComputeSummary`:

```text
totalDeductions = Σ ActiveValue(row) WHERE row.is_artist_deduction = true
netShowRevenue  = grossRevenue − totalDeductions
```

Revenue rows are never flagged as deductions in UI; server does not block flag on non-expense rows today — UI enforces Expenses-only exposure (FR-002).

## Derived: Deduction editability (client)

| Event status | Budget locked | Permission | Toggle editable | Badge visible if flagged |
|--------------|---------------|------------|-----------------|--------------------------|
| `PRE_SHOW` | false | `canViewFinancials` | Yes | Yes |
| `PRE_SHOW` | true | `canEditSettlement` | Yes | Yes |
| `PRE_SHOW` | * | missing permission | No | Yes |
| `SETTLED` / `RECONCILED` | any | any | No | Yes |

Computed via `useCanEditLedgerStructure(status, isBudgetLocked)` for toggle; badge independent of hook.

## Validation rules (toggle)

| Rule | Enforcement |
|------|-------------|
| Expenses block only in UI | Client `blockType === 'EXPENSES'` |
| Mutation when settled/reconciled | Server → 400 |
| Stale `rowVersion` | Server → 409 |
| Missing column permission | Server → 403 (via `ValidateLineItemStructuralEditAsync` from 013) |

## UI presentation state (client, not persisted)

| State | DOM signals |
|-------|-------------|
| Flagged expense row | `tr.ledger-row--deduction` + `.ledger-row__deduction-badge` text "Deduction" |
| Editable toggle | Checkbox `.ledger-row__deduction` when `canEditStructure && isExpense` |
| Read-only flagged | Badge + row class without checkbox |
