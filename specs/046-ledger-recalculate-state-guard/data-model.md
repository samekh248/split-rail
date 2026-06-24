# Data Model: Ledger Recalculate Frozen-State Guard

**Feature**: 046-ledger-recalculate-state-guard  
**Date**: 2026-06-20  
**Schema changes**: None

This feature enforces and verifies immutability on the recalculate write path. No new tables or columns.

## Entities affected on recalculate

### Event (lifecycle gate)

| Field | Role in guard |
|-------|---------------|
| `status` | Must be checked before recalculate persists; `SETTLED` and `RECONCILED` → reject |

### Event artist (mutation target)

| Field | Writable on recalculate (editable states) | Frozen states |
|-------|------------------------------------------|---------------|
| `calculated_net_payout` | Recomputed from deal math | **Must not change** |
| `deal_type` | Not modified by recalculate | Unchanged |
| `base_guarantee`, `backend_percentage`, `tax_withholding_percentage`, `custom_formula_expression` | Not modified by recalculate | Unchanged |

Deal types under test (storage values):

| API / DTO value | Storage | Deal math branch |
|-----------------|---------|------------------|
| `"guarantee"` | `guarantee` | Guarantee vs backend split |
| `"door_split"` | `door_split` | Door-percentage split |
| `"custom"` | `custom` | `CustomFormulaEvaluator` |

### Financial line items (read-only inputs to recalculate)

Recalculate reads revenue/deduction line items to compute `net_show_revenue`; it does not mutate line items. Frozen-state rejection prevents reaching payout persistence even when line items are loaded.

## State write matrix (recalculate entry path)

| Event status | POST `/recalculate` | `calculated_net_payout` | Audit on reject |
|--------------|----------------------|-------------------------|-----------------|
| `PRE_SHOW` (editable) | 200 — recompute + persist | May change | None |
| `SETTLED` | 400 — reject before persist | Unchanged | `recalculate` |
| `RECONCILED` | 400 — reject before persist | Unchanged | `recalculate` |

## Guard placement invariant

```
RecalculateAsync:
  1. LoadEventForMutationAsync (venue-scoped)
  2. AssertNotSettledOrReconciled(evt, venueId, "recalculate")  ← MUST precede step 3
  3. RecalculateAndPersistAsync(evt)  ← writes CalculatedNetPayout
  4. BuildLedgerGrid response
```

Violation: any code path reaching step 3 when `evt.Status ∈ {SETTLED, RECONCILED}`.

## Test fixture extensions

| Fixture | Purpose |
|---------|---------|
| `SeedFinalizedEventWithArtistDealAsync(..., dealType, customFormula?)` | Real finalize + artist with target deal type |
| `SeedFinalizedThenReconciledAsync(..., includeArtist: true)` | RECONCILED recalculate rejection |
| Captured `artist.CalculatedNetPayout` post-finalize | Before/after recalculate assertion |
| `originalPdfBytes` from archive store | PDF stability (spec 044 pattern) |

## Immutability audit entry (verification target)

On rejected recalculate, one Warning log per [spec 039 contract](../039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md):

| Property | Expected value |
|----------|----------------|
| `Operation` | `recalculate` |
| `EventStatus` | `SETTLED` or `RECONCILED` |
| `EventId`, `VenueId`, `UserId` | Match test seed |

## Payout stability invariant

```
∀ frozen event E with artist A:
  payout(A) after rejected POST /recalculate == payout(A) after finalize
  bytes(archive(E)) unchanged
```
