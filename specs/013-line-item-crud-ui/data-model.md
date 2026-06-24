# Data Model: Production Line-Item CRUD UI

**Feature**: 013-line-item-crud-ui | **Date**: 2026-06-17

This feature adds **no new database tables or columns**. It surfaces CRUD controls for the existing `financial_line_items` entity defined in [002-financial-ledger-grid/data-model.md](../002-financial-ledger-grid/data-model.md). Below documents the fields and rules relevant to this UI feature.

## Entity: Financial Line Item (existing)

| Field | Type | UI relevance |
|-------|------|--------------|
| id | UUID | Row identity for update/delete/reorder |
| event_id | UUID FK | Scoped via route `{venueId}/{eventId}` |
| block_type | VARCHAR | `REVENUE` or `EXPENSES` for user-managed rows; `DEAL_MATH` not user-addable |
| row_label | VARCHAR | Required on add; editable inline |
| sort_order | INT | Reorder target; swap with neighbor on move up/down |
| is_artist_deduction | BOOL | Expenses only; toggle inline |
| proforma_value | NUMERIC(12,2) | Required on add when budget unlocked |
| settlement_value | NUMERIC(12,2) | Required on add when budget locked |
| qbo_actual_value | NUMERIC(12,2) | Read-only in UI (never sent on create/update) |
| notes | TEXT | Existing inline edit (unchanged) |
| is_hidden_from_promoter | BOOL | Out of scope for this feature's UI |
| xmin | concurrency token | Exposed as `rowVersion` (base64) on every mutation |

## Derived view: Structural editability (client-side)

Not persisted. Computed per render from event state + user permissions:

| Event state | Budget locked | Permission required | Structural CRUD allowed |
|-------------|---------------|---------------------|-------------------------|
| `PRE_SHOW` | false | `can_view_financials` | Yes (proforma column active) |
| `PRE_SHOW` | true | `can_edit_settlement` | Yes (settlement column active) |
| `SETTLED` | any | — | No |
| `RECONCILED` | any | — | No |

Matches `EditabilityDto` from `GET /ledger` for column editing; structural flag uses the same permission mapping per clarification.

## Validation rules (create/update)

| Rule | Enforcement |
|------|-------------|
| Label non-empty after trim | Client form validation + server trim |
| `block_type ∈ {REVENUE, EXPENSES}` | Server `ValidateBlockType` |
| Add during planning: `proformaValue` required (2 dp string) | Client form |
| Add during settlement: `settlementValue` required; `proformaValue = "0.00"` | Client form + server column validator |
| `sortOrder ≥ 0` | Client assigns on add/reorder |
| Stale `rowVersion` on update | Server → 409 Conflict |
| Mutation when settled/reconciled | Server → 400 `LedgerStateException` |

## Reorder algorithm (client)

Given rows `[R0, R1, …, Rn]` sorted by `sortOrder` within a block:

1. **Move down** on `Ri`: swap `sortOrder` values with `Ri+1` via two PUTs.
2. **Move up** on `Ri`: swap with `Ri-1`.
3. Disable move-up on first row; disable move-down on last row.
4. On any PUT failure, invalidate ledger query (no optimistic reorder).

## State transitions (structural ops)

```text
PRE_SHOW (unlocked) ──lock budget──► PRE_SHOW (locked) ──settle──► SETTLED ──reconcile──► RECONCILED
     │ add/edit/delete/reorder              │ add/edit/delete/reorder              │ read-only
     │ (can_view_financials)                  │ (can_edit_settlement)                │
```

No new server-side state; UI controls follow this diagram.
