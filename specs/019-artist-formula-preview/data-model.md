# Data Model: Artist Edit Flow with Live Formula Preview

**Feature**: 019-artist-formula-preview | **Date**: 2026-06-17

No new database tables or columns. This document describes existing `event_artists` fields, client form state, and preview derivation. Full entity definition: [002-financial-ledger-grid/data-model.md](../002-financial-ledger-grid/data-model.md).

## Entity: Event Artist (existing)

| Field | Type | Feature relevance |
|-------|------|-----------------|
| id | UUID | Edit target identity; reorder row key |
| artist_name | TEXT | Editable in shared form |
| performance_order | INT | Reordered via up/down swap PUTs (not numeric input) |
| deal_type | ENUM | `guarantee` \| `door_split` \| `custom` |
| custom_formula_expression | TEXT | Editable when `deal_type = custom` |
| base_guarantee | NUMERIC(12,2) | Editable; token `BaseGuarantee` in formulas |
| backend_percentage | NUMERIC(5,2) | Editable; drives split % and `SplitPercentage` token |
| tax_withholding_percentage | NUMERIC(5,2) | Editable; applied on standard deal types |
| calculated_net_payout | NUMERIC(12,2) | Server-computed after save; shown in list |
| row_version | concurrency token | Required on every `PUT` |

## Derived: Ledger summary inputs (server, read by preview)

From `LedgerGridResponse.summary` (already computed for active column):

| Field | Preview use |
|-------|-------------|
| gross_revenue | Token `GrossRevenue`; guarantee/door math |
| total_deductions | Token `TotalDeductions` |
| net_show_revenue | Implicit in standard deal math (`gross − deductions`) |

Active column follows budget lock (proforma when unlocked, settlement when locked) — same as `LedgerService.ComputeSummary`.

## Client: Shared add/edit form state (not persisted)

| State | Purpose |
|-------|---------|
| `formMode` | `add` \| `edit` |
| `editingArtistId` | Set when `formMode = edit` |
| `snapshotRowVersion` | Optimistic concurrency for `PUT` |
| `artistName`, `dealType`, `baseGuarantee`, `backendPercentage`, `taxWithholding`, `customFormula` | Bound form fields |
| `isDirty` | Drives unsaved-change confirmation on switch |
| `previewResult` | `{ payout }` or `{ error }` from `dealMathPreview` |

## Derived: Artist deal editability (client)

| Event status | Budget locked | Permission | Panel editable |
|--------------|---------------|------------|----------------|
| `PRE_SHOW` | false | `canViewFinancials` | Yes |
| `PRE_SHOW` | true | `canEditSettlement` | Yes |
| `PRE_SHOW` | * | missing | No (read-only list) |
| `SETTLED` / `RECONCILED` | any | any | No |

Computed via `useCanEditLedgerStructure(status, isBudgetLocked)`.

## Validation rules

| Rule | Enforcement |
|------|-------------|
| Edit only in `PRE_SHOW` | Server `AssertArtistEditable` → 400 |
| Column-aware permission | Server `ValidateArtistStructuralEditAsync` → 403 |
| Stale `rowVersion` on save/reorder | Server → 409 |
| Custom formula invalid | Server → 422 on save; client preview shows error (no misleading payout) |
| Reorder at list boundary | Client disables up/down via `canMoveArtist` |

## Reorder swap semantics

Given artists sorted by `performance_order`:

```text
swap(current, neighbor) →
  PUT current with neighbor.performanceOrder
  PUT neighbor with current.performanceOrder
  POST /recalculate
```

Same immediate-persist pattern as line-item `sort_order` swap.
