# Quickstart & Validation: Event Card Lifecycle Progress Bar

**Feature**: `077-event-card-progress-bar` | **Date**: 2026-07-02

Manual and automated validation for the dashboard event card progress bar. See [contracts/event-card-progress-bar-ui.md](./contracts/event-card-progress-bar-ui.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20+
- Branch `077-event-card-progress-bar` with spec clarifications applied
- Existing `EventCard` component and dashboard overview wiring (specs 025, 032)

```bash
cd apps/web
npm install
```

## Automated tests

```bash
cd apps/web
npm run test -- tests/lib/eventCardProgress.test.ts
npm run test -- tests/components/dashboard/EventCardProgressBar.test.tsx
npm run test -- tests/components/dashboard/EventCard.test.tsx
```

**Expected**: All scenarios pass; ≥80% line/branch coverage on `eventCardProgress.ts`, `EventCardProgressBar.tsx`, modified `EventCard.tsx`, and test files.

## Scenario A — Milestone resolution (User Story 1, P1)

Run unit tests for `resolveEventCardProgressPosition`:

| Input placement | Input date | Expected active milestone |
|-----------------|------------|---------------------------|
| `HOLD_1` | future | holds |
| `HOLD_2` | future | holds (same as Hold 1) |
| `CONFIRMED` | future | confirmed |
| `CONFIRMED` | today | eventDate |
| `CONFIRMED` | past | postEvent |
| `null` | past | postEvent (legacy) |
| `CONFIRMED` | null | confirmed |
| `CANCELLED` | any | null (cancelled) |
| `HOLD_1` | today | holds (date ignored) |

## Scenario B — Full card progress bar (User Stories 1–2)

1. Render `EventCard` with `CONFIRMED` placement and a future `eventDate`.

**Expected**: Progress bar at bottom of card (`data-testid="event-card-progress-{id}"`); four bubbles; **Confirmed** bubble has active class; inline labels visible.

2. Repeat with past `eventDate`.

**Expected**: **Post-event** bubble active; fill extends to 100%.

## Scenario C — Compact tooltips (User Stories 3–4)

1. Render `EventCard` with `compact={true}`.

**Expected**: No inline milestone labels; bubbles visible.

2. Hover or focus a bubble.

**Expected**: Tooltip with full label appears.

3. Simulate click on bubble (touch).

**Expected**: Tooltip toggles; click outside dismisses.

## Scenario D — Cancelled placement (clarification)

1. Render card with `bookingPlacementStatus: 'CANCELLED'`.

**Expected**: Bar has `event-card__progress--cancelled`; all bubbles de-emphasized; no active class; `fillPercent` 0; `aria-label` mentions cancelled/inactive.

## Scenario E — Coexistence with booking badge (FR-010)

1. Render hold and confirmed fixtures.

**Expected**: Booking badge still visible with tier styling; progress bar complements (does not replace) badge.

## Scenario F — Dashboard overview smoke (optional)

1. Start dev server and open dashboard overview with mixed event fixtures.

```bash
cd apps/web
npm run dev
```

**Expected**: Every event card in tonight/upcoming/recent/pinned zones shows bottom progress bar; gradient uses brand orange-to-brown tones.

## Coverage gate

```bash
cd apps/web
npm run test -- --coverage
```

**Expected**: Touched files meet ≥80% line/branch coverage (Constitution III).
