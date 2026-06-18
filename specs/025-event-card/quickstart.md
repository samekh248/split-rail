# Quickstart & Validation: Event Card with Quick Links

**Feature**: `025-event-card` | **Date**: 2026-06-18

Manual and automated validation for the dashboard Event Card component. See [contracts/event-card-ui.md](./contracts/event-card-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- **SPLR-64 merged**: `eventLifecycle.ts`, `eventCardLabels.ts` and their unit tests on the branch
- **SPLR-63 / 023 merged**: `navigateToEventWorkspace` available for parent wiring (card tested via mock callback)

```bash
cd apps/web
npm install
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/components/dashboard/EventCard.test.tsx
npm run test -- tests/lib/eventCardQuickLinks.test.ts tests/lib/eventCardVariance.test.ts  # if created
```

**Expected**: All EventCard scenarios pass; ≥80% line/branch coverage on `EventCard.tsx`, new `lib/*` helpers, and test files.

## Scenario A — Event summary (User Story 1, P1)

1. Render `EventCard` with fixture `EVENT_A` (title + date from `tests/fixtures/events.ts`).

**Expected**: Title "Show A" and formatted date visible; booking preview badge with tooltip present.

2. Render with `title: null`, `eventDate: null`.

**Expected**: "Untitled event" and "Date TBD" placeholders; layout intact.

## Scenario B — Phase quick links (User Story 2, P2)

Fixtures (adjust dates/status to hit each phase per SPLR-64 rules):

| Phase | Fixture hints | Expected links |
|-------|---------------|----------------|
| Pre-Show | `PRE_SHOW`, `isBudgetLocked: false` | Edit Deal Builder, Lock Budget |
| Night Of | today's date OR locked PRE_SHOW | Settlement Wizard, Capture Signature |
| Post-Show | past date + SETTLED/RECONCILED | View QBO Variance, One-Click QBO Sync |
| Unknown | ambiguous status | Open workspace only |

For each, click a link and assert `onQuickLink` mock received `(venueId, eventId, focus)` with correct `focus`.

## Scenario C — Permission filtering (FR-012)

1. Render Pre-Show card with full permissions → two links.
2. Re-render with `canLockBudget: false` → Lock Budget hidden; Edit Deal Builder remains.
3. Re-render with all phase permissions false but `canViewFinancials: true` → Open workspace fallback only.

## Scenario D — Alerts (User Story 3, P3)

1. Pass `lineItems` with one row where QBO actual < settlement → variance badge visible.
2. Pass rows with no negative variance → badge absent.
3. Pass event triggering `deriveBottleneckAlerts` → chips visible with expected labels.

## Scenario E — Pin toggle (User Story 4, P4)

1. Render without `onPinToggle` → no pin button in DOM.
2. Render with `isPinned={false}` + `onPinToggle` → click toggles visual state; parent mock called.
3. Use `pinnedEventStorage` in parent test harness → refresh simulation persists pin.

## Scenario F — Parent navigation wiring (smoke)

In Storybook or temporary test page (optional pre-SPLR-66):

```typescript
<EventCard
  event={event}
  permissions={permissions}
  onQuickLink={(v, e, focus) => navigateToEventWorkspace(v, e, focus)}
/>
```

Click **Edit Deal Builder** on Pre-Show card.

**Expected**: URL becomes `/venues/{v}/events/{e}?focus=deal` (focus scroll may be no-op until SPLR-67).

## Coverage gate

```bash
cd apps/web
npm run test:coverage -- tests/components/dashboard/EventCard.test.tsx
```

**Expected**: Touched files ≥80% lines and branches per Constitution III.
