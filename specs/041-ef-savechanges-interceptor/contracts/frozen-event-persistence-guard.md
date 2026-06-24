# Persistence Guard Contract: Frozen-Event Immutability Interceptor

**Feature**: 041-ef-savechanges-interceptor  
**Date**: 2026-06-20  
**Type**: Internal persistence-layer behavior contract (not a public HTTP API)

## Purpose

Define the behavior of `FrozenEventImmutabilityInterceptor` — the defense-in-depth immutability enforcement that runs immediately before every EF Core `SaveChanges` on `ApplicationDbContext`. Complements service-layer guards (spec 004) and audit logging (spec 039).

## Trigger

Evaluate on every `SavingChanges` / `SavingChangesAsync` invocation before commit.

## Guard scope

| In scope | Out of scope |
|----------|--------------|
| `events` | `qbo_sync_ledger` |
| `event_artists` | `settlement_reversals` |
| `financial_line_items` | All other tables |

## Rejection conditions

Reject the **entire save** (throw before commit) when any in-scope entry violates the rules below.

### Parent/original event is frozen

An event is frozen when status is `SETTLED` or `RECONCILED` at evaluation time (see [data-model.md](../data-model.md) for original-vs-database status rules).

### `FinancialLineItem`

| Entity state | Rule |
|--------------|------|
| `Added` | Reject |
| `Deleted` | Reject |
| `Modified` | Reject unless **only** `QboActualValue` and/or `UpdatedAt` differ from original values (field-diff) |

### `EventArtist`

| Entity state | Rule |
|--------------|------|
| `Added`, `Modified`, `Deleted` | Reject |

### `Event`

| Entity state | Rule |
|--------------|------|
| `Deleted` | Reject |
| `Modified` (original status frozen) | Reject unless authorized save context matches pending transition |
| `Modified` (original status not frozen) | Allow (covers finalize PRE_SHOW → SETTLED) |

## Authorized save context

Sanctioned workflows MUST wrap `SaveChanges` in an authorized scope:

```csharp
using (_saveContext.Authorize(FrozenEventSaveReason.SettlementReversal))
{
    await _db.SaveChangesAsync(cancellationToken);
}
```

| Reason | Permitted when original status frozen |
|--------|---------------------------------------|
| `SettlementReversal` | Reversal field changes on `Event` |
| `EventReconciliation` | SETTLED → RECONCILED field changes on `Event` |

Missing authorized context on a multi-field frozen event save: **reject**.

## Audit emission on rejection

Persistence rejections MUST call `FrozenEventMutationAuditor.RejectIfFrozen` using the **same log contract** as [spec 039 frozen-event-mutation-audit-log](../../039-log-frozen-mutation-rejections/contracts/frozen-event-mutation-audit-log.md), with `persistence_*` operation labels defined in [data-model.md](../data-model.md).

## Exception type

`LedgerStateException` — same as service-layer immutability rejections. Message: default settled/reconciled text unless entity-specific message warranted.

## HTTP response (unchanged — reference only)

Persistence rejections on bypass paths propagate as unhandled exceptions unless caught. Standard API paths still hit service-layer guards first and return:

- **400 Bad Request**
- Error type: `ledger_state`

FR-011: No change to user-facing API error semantics for standard mutation endpoints.

## Verification contract (automated)

### Minimum integration coverage (FR-012)

| Test | Assert | Verified |
|------|--------|----------|
| Raw DbContext line-item mutation on SETTLED event | `LedgerStateException`; DB unchanged; audit log with `persistence_update_line_item` | Yes — `FrozenEventPersistenceGuardTests` (requires Docker) |
| Raw DbContext event metadata mutation on RECONCILED event | Rejected + `persistence_update_event` audit | Yes — unit + integration tests |
| Raw DbContext artist delete on SETTLED event | Rejected + `persistence_delete_artist` audit | Yes — unit + integration tests |
| QBO actuals recompute on SETTLED event | Save succeeds; no rejection audit | Yes — unit + integration tests |
| Settlement reversal via API | Save succeeds with authorized context | Yes — integration test (requires Docker) |
| Reconcile via API | Save succeeds with authorized context | Yes — integration test (requires Docker) |
| Finalize PRE_SHOW event | Save succeeds (source not frozen) | Yes — integration test (requires Docker) |
| Mixed actuals + settlement value change on frozen line item | Rejected | Yes — unit test |

### Unit coverage

| Test | Assert | Verified |
|------|--------|----------|
| Field-diff allows only QboActualValue + UpdatedAt | Pass | Yes — `FrozenEventImmutabilityInterceptorTests` |
| Field-diff rejects settlement value change | Fail | Yes — `FrozenEventImmutabilityInterceptorTests` |
| Authorized context permits reconciliation transition | Pass | Yes — `FrozenEventImmutabilityInterceptorTests` |
| Bypass blocks line item / event / artist mutations | Fail | Yes — `FrozenEventImmutabilityInterceptorTests` |
| Save context scope enter/exit | Pass | Yes — `FrozenEventSaveContextTests` |

## Prohibited log content

Same as spec 039 — no signatures, tokens, secrets, PII, or financial field values in audit entries.
