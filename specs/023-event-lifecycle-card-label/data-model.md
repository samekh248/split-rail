# Data Model: Event Lifecycle & Card Label Utilities

**Feature**: 023-event-lifecycle-card-label | **Date**: 2026-06-18

No new database tables or API entities. This document describes derived lifecycle phases, label mappings, and permission rules computed from existing event fields. Platform event entity: [002-financial-ledger-grid/data-model.md](../002-financial-ledger-grid/data-model.md).

## Inputs (existing — read-only)

| Field | Source | Type | Notes |
|-------|--------|------|-------|
| status | `EventResponse`, ledger DTO | `EventStatus` (`PRE_SHOW` \| `SETTLED` \| `RECONCILED`) | Primary lifecycle axis |
| isBudgetLocked | `EventResponse`, ledger DTO | `boolean` optional | Meaningful only during `PRE_SHOW`; ignored when settled/reconciled |

## Derived: Event Lifecycle Phase

Computed by `resolveLifecyclePhase(status, isBudgetLocked?)`:

```
                    ┌─────────────────┐
                    │  status input   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          PRE_SHOW       SETTLED      RECONCILED
              │              │              │
     ┌────────┴────────┐     │              │
     ▼                 ▼     ▼              ▼
 isBudgetLocked?    settled  reconciled
     │    │
    no   yes
     │    │
     ▼    ▼
planning-  planning-
unlocked   locked
```

| Phase | status | isBudgetLocked | Badge label |
|-------|--------|----------------|-------------|
| planning-unlocked | PRE_SHOW | false / undefined | Planning |
| planning-locked | PRE_SHOW | true | Budget locked |
| settled | SETTLED | (ignored) | Settled |
| reconciled | RECONCILED | (ignored) | Reconciled |
| unknown | null / unrecognized | any | Unknown |

## Derived: Permission flags (state machine only)

| Flag | planning-unlocked | planning-locked | settled | reconciled | unknown |
|------|-------------------|-----------------|---------|------------|---------|
| isPreShow | true | true | false | false | false |
| canEditEventMetadata | true | true | false | false | false |
| canDeleteEvent | true | false | false | false | false |
| isEventFullyLocked | false | false | true | true | true |

**Note**: `canEditEventMetadata` / `canDeleteEvent` answer lifecycle eligibility only. UI still gates on user role permissions separately.

## Derived: Action hint labels

Returned when the corresponding action is **blocked**; `null` when permitted.

| Phase | resolveEditActionHint | resolveDeleteActionHint |
|-------|----------------------|-------------------------|
| planning-unlocked | null | null |
| planning-locked | null | "Budget locked" |
| settled | "Event locked" | "Event locked" |
| reconciled | "Event locked" | "Event locked" |
| unknown | "Event locked" | "Event locked" |

## Client modules (not persisted)

| Module | Responsibility |
|--------|----------------|
| `eventLifecycle.ts` | Phase resolution + boolean permission helpers |
| `eventCardLabel.ts` | Status badge text + action hint text |
| `eventSelection.ts` | Event list filter + active ID resolution (unchanged scope) |

## State transitions (reference — read-only in this feature)

```
[PRE_SHOW, locked=false]  ──lock-budget──►  [PRE_SHOW, locked=true]
        │                                           │
        │         settlement signature              │
        └──────────────────┬────────────────────────┘
                           ▼
                      [SETTLED]
                           │ QBO sync
                           ▼
                     [RECONCILED]
```

Utilities reflect current state; they do not trigger transitions.

## Validation rules

| Rule | Enforcement |
|------|-------------|
| Unknown status → unknown phase, all mutations blocked | `resolveLifecyclePhase` fallback |
| Undefined `isBudgetLocked` on Pre-Show → treat as false | Default parameter in utilities |
| Budget flag on Settled/Reconciled → ignored for phase | Phase resolver branch order |
