# Contract: Event Lifecycle & Card Label Utilities

**Feature**: 023-event-lifecycle-card-label | **Date**: 2026-06-18

Behavioral contract for frontend pure utilities. No REST API changes — documents function semantics both implementation and tests MUST satisfy.

## Module: `eventLifecycle.ts`

### Types

```text
EventLifecyclePhase =
  | 'planning-unlocked'
  | 'planning-locked'
  | 'settled'
  | 'reconciled'
  | 'unknown'
```

### resolveLifecyclePhase(status, isBudgetLocked?)

| status | isBudgetLocked | Returns |
|--------|----------------|---------|
| PRE_SHOW | false / undefined | planning-unlocked |
| PRE_SHOW | true | planning-locked |
| SETTLED | any | settled |
| RECONCILED | any | reconciled |
| null / undefined / unrecognized | any | unknown |

### isPreShow(status)

Returns `true` iff `status === 'PRE_SHOW'`.

### canEditEventMetadata(status, isBudgetLocked?)

Returns `true` iff `status === 'PRE_SHOW'`.

### canDeleteEvent(status, isBudgetLocked?)

Returns `true` iff `status === 'PRE_SHOW'` AND `isBudgetLocked` is not truthy.

### isEventFullyLocked(status, isBudgetLocked?)

Returns `true` iff `status === 'SETTLED'` OR `status === 'RECONCILED'`. Budget flag ignored.

## Module: `eventCardLabel.ts`

### formatStatusBadgeLabel(status, isBudgetLocked?)

Delegates to phase resolution; returns:

| Phase | Label |
|-------|-------|
| planning-unlocked | Planning |
| planning-locked | Budget locked |
| settled | Settled |
| reconciled | Reconciled |
| unknown | Unknown |

### resolveEditActionHint(status, isBudgetLocked?)

| Phase | Returns |
|-------|---------|
| planning-unlocked | null |
| planning-locked | null |
| settled | Event locked |
| reconciled | Event locked |
| unknown | Event locked |

### resolveDeleteActionHint(status, isBudgetLocked?)

| Phase | Returns |
|-------|---------|
| planning-unlocked | null |
| planning-locked | Budget locked |
| settled | Event locked |
| reconciled | Event locked |
| unknown | Event locked |

## Golden test matrix

Both `eventLifecycle.test.ts` and `eventCardLabel.test.ts` MUST assert every row:

| # | status | isBudgetLocked | phase | canEditMetadata | canDelete | badge | editHint | deleteHint |
|---|--------|----------------|-------|-----------------|-----------|-------|----------|------------|
| G1 | PRE_SHOW | false | planning-unlocked | true | true | Planning | null | null |
| G2 | PRE_SHOW | undefined | planning-unlocked | true | true | Planning | null | null |
| G3 | PRE_SHOW | true | planning-locked | true | false | Budget locked | null | Budget locked |
| G4 | SETTLED | false | settled | false | false | Settled | Event locked | Event locked |
| G5 | SETTLED | true | settled | false | false | Settled | Event locked | Event locked |
| G6 | RECONCILED | false | reconciled | false | false | Reconciled | Event locked | Event locked |
| G7 | null | false | unknown | false | false | Unknown | Event locked | Event locked |
| G8 | 'INVALID' | false | unknown | false | false | Unknown | Event locked | Event locked |

## Consumer contract: EventCombobox

After migration:

1. Status badges MUST call `formatStatusBadgeLabel(event.status, event.isBudgetLocked)` — not a status-only formatter.
2. Edit button visibility MUST use `canEditEventMetadata`.
3. Delete button visibility MUST use `canDeleteEvent`.
4. Inline hints MUST use `resolveEditActionHint` / `resolveDeleteActionHint` when actions are hidden — no hardcoded hint strings in JSX.

## Parity requirement

For every golden row G1–G8, utility outputs MUST be deterministic and independent of React render context.

## Out of scope

- REST request/response changes
- User role / permission checks
- Ledger column editability (proforma vs. settlement)
- CSS badge styling variants
- Backend lifecycle enforcement (already in API)
