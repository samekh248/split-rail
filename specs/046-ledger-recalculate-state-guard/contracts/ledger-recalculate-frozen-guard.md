# Contract: Ledger Recalculate Frozen-State Guard

**Feature**: 046-ledger-recalculate-state-guard  
**Date**: 2026-06-20  
**Type**: Service-layer write-path contract (existing HTTP endpoint)

## Purpose

Define enforcement and verification obligations for `LedgerService.RecalculateAsync` on frozen events (SPLR-34). Closes the audit gap where artist payout recalculation could bypass settlement immutability.

Complements:

- [spec 004](../004-settlement-freeze-archiving/spec.md) — immutability rules
- [spec 039 audit log](../039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md) — log format
- [spec 044 verification](../044-immutability-settle-coverage/contracts/settled-event-immutability-verification.md) — real-finalize seeding (row #10 recalculate baseline)

## HTTP surface

| Method | Route | Auth | Frozen behavior |
|--------|-------|------|-----------------|
| POST | `/api/venues/{venueId}/events/{eventId}/recalculate` | Required | **400** when `SETTLED` or `RECONCILED` |

Success (editable states): **200** with `LedgerGridResponse`.

Error body: standard API envelope with `ledger_state` code (via `LedgerStateException`).

## Service-layer contract

### Precondition (mandatory)

Before calling `RecalculateAndPersistAsync`:

```text
IF event.status IN (SETTLED, RECONCILED):
  emit immutability audit (operation = recalculate)
  THROW LedgerStateException
ELSE:
  proceed with recalculate
```

### Prohibited side effects on reject

- No `SaveChanges` updating `event_artists.calculated_net_payout`
- No archived settlement PDF regeneration
- No change to `financial_line_items` snapshot fields

### Allowed on editable states

- Full recalculate including payout persistence
- Indirect recalculate from line-item/artist mutations (those paths enforce their own guards first)

## Verification contract

### Lifecycle matrix (real finalize seeding)

| # | Lifecycle | Seed | Action | HTTP | Audit | Payout | PDF |
|---|-----------|------|--------|------|-------|--------|-----|
| 1 | SETTLED | Finalize with artist | POST recalculate | 400 | `recalculate` | Unchanged | Unchanged |
| 2 | RECONCILED | Finalize → reconcile with artist | POST recalculate | 400 | `recalculate` | Unchanged | Unchanged |

**Prohibited seeding**: Direct status assignment.

### Deal-type matrix (SETTLED, each independent test)

| # | `deal_type` | Artist config (example) | HTTP | Audit | Payout |
|---|-------------|-------------------------|------|-------|--------|
| 3 | `guarantee` | base 5000, backend 70% | 400 | `recalculate` | Unchanged |
| 4 | `door_split` | backend 80% | 400 | `recalculate` | Unchanged |
| 5 | `custom` | formula `net_show_revenue * 0.5` | 400 | `recalculate` | Unchanged |

### Per-test assertions (all rejection cases)

1. HTTP **400 Bad Request**
2. One Warning audit log: `Rejected frozen event mutation` with `Operation = recalculate`
3. DB: `event_artists.calculated_net_payout` equals pre-attempt value
4. Archive store: PDF bytes equal post-finalize fingerprint
5. `ArchiveStore.StoredObjectCount` unchanged

### Non-regression (editable state)

| Action | HTTP | Audit |
|--------|------|-------|
| POST recalculate on `PRE_SHOW` event with line items | 200 | None |

## Operation constant

| Constant | Value |
|----------|-------|
| `FrozenEventMutationOperation.Recalculate` | `recalculate` |

Must match audit log `Operation` property in tests.
