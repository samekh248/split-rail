# Quickstart & Validation: Event Lifecycle & Card Label Utilities

**Feature**: 024-event-lifecycle-card-label | **Date**: 2026-06-18

Validates lifecycle phase resolution, card labels, action hints, and combobox migration. See [contracts/event-lifecycle-utilities.md](./contracts/event-lifecycle-utilities.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- Feature 015 (event list & selection UI) implemented
- Local web dev server optional for manual checks

```bash
cd apps/web && npm run test -- eventLifecycle eventCardLabel eventSelection EventCombobox
```

## Scenario A — Golden matrix (User Story 2 & 4, SC-001)

**Automated**: `eventLifecycle.test.ts` and `eventCardLabel.test.ts` assert all rows G1–G8 from the contract.

**Expected**: All phase, permission, badge, and hint outputs match the contract table.

## Scenario B — Budget-locked badge fix (User Story 1, SC-003)

**Automated**: Combobox or card-label test with `{ status: 'PRE_SHOW', isBudgetLocked: true }`.

**Manual** (optional):
1. Open dashboard with a Pre-Show event whose budget is locked.
2. View event selector badge.

**Expected**: Badge reads **"Budget locked"**, not "Planning".

## Scenario C — Planning-unlocked labels (User Story 1)

**Automated**: Row G1/G2 in golden matrix.

**Manual** (optional):
1. Open dashboard with unlocked Pre-Show event.

**Expected**: Badge reads **"Planning"**; edit and delete affordances available (subject to user permission).

## Scenario D — Settled/reconciled lock hints (User Story 3)

**Automated**: Rows G4–G6; `resolveEditActionHint` and `resolveDeleteActionHint` return "Event locked".

**Manual** (optional):
1. View settled event in combobox as user with event-management permission.

**Expected**: Edit/delete hidden or disabled with **"Event locked"** hint; badge reads **"Settled"** or **"Reconciled"**.

## Scenario E — Unknown status fallback (Edge cases)

**Automated**: Rows G7–G8.

**Expected**: Phase `unknown`, badge **"Unknown"**, all mutation flags false, lock hints present.

## Scenario F — No duplicate lifecycle logic (SC-004)

```bash
cd apps/web && rg "formatEventStatus|canEditEvent|canDeleteEvent" src/
```

**Expected**: No matches in `eventSelection.ts` or `EventCombobox.tsx` inline strings for "Budget locked"/"Event locked" (hints come from `eventCardLabel.ts`).

## CI verification

```bash
cd apps/web && npm run test -- eventLifecycle eventCardLabel eventSelection EventCombobox

# Coverage on touched files (must be ≥80%)
cd apps/web && npm run test:coverage -- eventLifecycle eventCardLabel
```

## Pass criteria

| ID | Criterion |
|----|-----------|
| SC-001 | Golden matrix G1–G8 pass in both utility test files |
| SC-002 | Combobox badge uses `formatStatusBadgeLabel` with budget flag |
| SC-003 | G3 / Scenario B — budget-locked Pre-Show shows "Budget locked" |
| SC-004 | Scenario F — single utility import path; no duplicate helpers |
| SC-005 | ≥80% coverage on new/modified frontend utility and consumer files |
