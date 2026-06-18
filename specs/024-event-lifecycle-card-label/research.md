# Research: Event Lifecycle & Card Label Utilities

**Feature**: 024-event-lifecycle-card-label | **Date**: 2026-06-18

## R1 — Module split: lifecycle vs. labels

**Decision**: Two modules under `apps/web/src/venue/`:
- `eventLifecycle.ts` — phase resolution and boolean permission helpers (state machine).
- `eventCardLabel.ts` — human-readable badge and action-hint strings (presentation).

**Rationale**: Spec FR-001/FR-003 require separate concerns; lifecycle rules may be reused by non-UI code (hooks, future ledger helpers) without importing display strings. Matches existing `venue/` colocation pattern (`eventSelection.ts`, `activeEventStorage.ts`).

**Alternatives considered**:
- Single `eventLifecycle.ts` with labels inline — rejected; couples gating logic to copy changes and makes testing matrices harder to read.
- `lib/` placement — rejected; these are venue/event domain utilities, not generic lib helpers.

## R2 — Phase enum design

**Decision**: Export string union `EventLifecyclePhase`:

```text
'planning-unlocked' | 'planning-locked' | 'settled' | 'reconciled' | 'unknown'
```

Resolve via `resolveLifecyclePhase(status, isBudgetLocked?)`:
- `PRE_SHOW` + `!isBudgetLocked` → `planning-unlocked`
- `PRE_SHOW` + `isBudgetLocked` → `planning-locked`
- `SETTLED` → `settled` (ignore budget flag)
- `RECONCILED` → `reconciled` (ignore budget flag)
- null/undefined/unrecognized status → `unknown`

**Rationale**: Spec FR-002 requires four canonical phases plus safe fallback for edge cases. String union is readable in tests and switch statements without introducing runtime enums.

**Alternatives considered**:
- Numeric phase codes — rejected; less self-documenting in tests and combobox.
- Collapse planning-locked into `PRE_SHOW` only — rejected; spec explicitly distinguishes badge label and delete gating for budget-locked planning.

## R3 — Permission helper semantics

**Decision**:

| Helper | True when |
|--------|-----------|
| `isPreShow(status)` | status === `PRE_SHOW` |
| `canEditEventMetadata(status, isBudgetLocked?)` | status === `PRE_SHOW` (both locked and unlocked) |
| `canDeleteEvent(status, isBudgetLocked?)` | status === `PRE_SHOW` && !isBudgetLocked |
| `isEventFullyLocked(status, isBudgetLocked?)` | status === `SETTLED` \|\| status === `RECONCILED` |

For `unknown` phase: all mutating permissions false.

**Rationale**: Matches feature 015 (FR-018, FR-020, FR-022, FR-025) and existing `canEditEvent`/`canDeleteEvent` behavior in `eventSelection.ts`, with explicit naming (`canEditEventMetadata` vs. role-aware ledger structure edit).

**Alternatives considered**:
- Rename to keep `canEditEvent` — rejected; ambiguous with metadata vs. structural ledger edit; new name aligns with spec terminology.
- Re-export aliases for backward compat — rejected; only one consumer (`EventCombobox`); clean break preferred.

## R4 — Card label copy

**Decision**:

| Phase | Status badge | Edit hint (when blocked) | Delete hint (when blocked) |
|-------|--------------|--------------------------|----------------------------|
| planning-unlocked | Planning | null | null |
| planning-locked | Budget locked | null | Budget locked |
| settled | Settled | Event locked | Event locked |
| reconciled | Reconciled | Event locked | Event locked |
| unknown | Unknown | Event locked | Event locked |

Hints return `null` when the corresponding action is permitted (FR-006).

**Rationale**: Fixes SC-003 gap where `formatEventStatus` always returned "Planning" for `PRE_SHOW`. Reuses existing combobox hint strings ("Budget locked", "Event locked") as centralized constants.

**Alternatives considered**:
- Longer hint sentences ("Deletion is blocked because…") — rejected; existing UI uses short hints; spec accepts current copy when centralized.
- Separate badge CSS variant per phase — deferred; out of spec scope (labels only).

## R5 — Input shape: primitives vs. event object

**Decision**: Core functions take `(status: EventStatus | string | null | undefined, isBudgetLocked?: boolean)`. Optional convenience overloads accept `Pick<EventResponse, 'status' | 'isBudgetLocked'>` for combobox call sites.

**Rationale**: FR-008 requires no React dependency; primitives keep utilities testable without fixtures. Generated `EventStatus` imported for type safety per Constitution VI.

**Alternatives considered**:
- Require full `EventResponse` — rejected; over-couples to list DTO shape.
- Accept only `EventStatus` enum — rejected; must handle unknown strings gracefully per edge cases.

## R6 — Migration and test consolidation

**Decision**:
- Remove lifecycle helpers from `eventSelection.ts`; keep `filterEvents` and `resolveActiveEventId` only.
- Move lifecycle tests from `eventSelection.test.ts` to `eventLifecycle.test.ts` and `eventCardLabel.test.ts`.
- Add combobox component assertion that budget-locked Pre-Show badge reads "Budget locked".

**Rationale**: Spec FR-007/SC-004 require single source of truth and no duplicate assertions. Feature 017 established extend/consolidate pattern for existing test files.

**Alternatives considered**:
- Re-export old names from `eventSelection.ts` — rejected; perpetuates duplicate entry points.
- Leave old functions deprecated — rejected; small codebase, one consumer.

## R7 — API and backend impact

**Decision**: Zero API/DTO/schema/backend changes. Utilities operate on fields already on `EventResponse` and ledger DTOs.

**Rationale**: Spec assumptions and FR-008; frontend-only extraction.

**Alternatives considered**:
- Shared lifecycle endpoint — rejected; state is already on event payload.

## R8 — Role-aware gating boundary

**Decision**: `useCanEditLedgerStructure` hook unchanged; it layers user permissions on top of lifecycle state. Utilities do NOT incorporate `canViewFinancials` / `canEditSettlement`.

**Rationale**: Spec FR-008 and Assumptions; state-machine rules are universal per event, permissions vary by user.

**Alternatives considered**:
- Merge permission + lifecycle in one helper — rejected; would require React/profile context in pure module.
