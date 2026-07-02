# Data Model: Event Card Lifecycle Progress Bar

**Feature**: `077-event-card-progress-bar` | **Date**: 2026-07-02

No database schema or API changes. Describes client-derived progress view models, milestone resolution rules, and UI state.

## API fields consumed (existing)

### `EventCardDto` / `EventResponse`

| Field | Progress bar use |
|-------|------------------|
| `bookingPlacementStatus` | `HOLD_1`, `HOLD_2`, `CONFIRMED`, `CANCELLED`, or null (legacy → Confirmed) |
| `eventDate` | ISO date `YYYY-MM-DD`; compared to local calendar day for Event date / Post-event milestones |

All types from `generated-api.ts` (Constitution VI). `BookingPlacementStatus` union re-exported from `@/lib/bookingCalendar`.

## Client type: `EventCardProgressMilestone`

```typescript
type EventCardProgressMilestone = 'holds' | 'confirmed' | 'eventDate' | 'postEvent';
```

Fixed left-to-right order; index 0–3 for fill percentage calculation.

## Client type: `EventCardProgressPosition`

| Field | Type | Rules |
|-------|------|-------|
| `activeMilestone` | `EventCardProgressMilestone \| null` | `null` when cancelled |
| `isCancelled` | `boolean` | `true` when placement is `CANCELLED` |
| `fillPercent` | `number` | 0–100; gradient fill width; `0` when cancelled |
| `completedMilestones` | `Set<EventCardProgressMilestone>` | Milestones before active (for bubble styling) |

## Milestone resolution rules (`resolveEventCardProgressPosition`)

Evaluate in order:

1. **Cancelled** (`CANCELLED`) → `isCancelled: true`, `activeMilestone: null`, `fillPercent: 0`, all bubbles de-emphasized.
2. **Holds** (`HOLD_1` or `HOLD_2`) → `activeMilestone: 'holds'` (calendar date ignored, including show-day).
3. **Missing event date** (null/invalid) with Confirmed or legacy null placement → `activeMilestone: 'confirmed'`.
4. **Confirmed** (or null placement) + future event date → `activeMilestone: 'confirmed'`.
5. **Event date** — Confirmed/legacy + event date is today (local) → `activeMilestone: 'eventDate'`.
6. **Post-event** — Confirmed/legacy + event date in the past → `activeMilestone: 'postEvent'`.

Financial `status` (`SETTLED`, `RECONCILED`) does **not** change milestone beyond calendar post-event rule.

## Milestone display labels

| Milestone | Full label | Abbreviated (narrow full card) |
|-----------|------------|--------------------------------|
| `holds` | Holds | Holds |
| `confirmed` | Confirmed | Confirmed |
| `eventDate` | Event date | Show |
| `postEvent` | Post-event | Post |

Compact cards: labels in tooltip/popover only (clarification).

## Client type: `EventCardProgressBarProps`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `bookingPlacementStatus` | `string \| null \| undefined` | no | Passed from event card |
| `eventDate` | `string \| null \| undefined` | no | ISO date |
| `eventId` | `string` | yes | `data-testid` suffix |
| `compact` | `boolean` | no | Default `false`; hides inline labels |
| `now` | `Date` | no | Injectable for deterministic tests |

## Bubble visual states

| State | Condition | CSS modifier |
|-------|-----------|--------------|
| Active | `milestone === activeMilestone` | `event-card__progress-bubble--active` |
| Completed | milestone index < active index | `event-card__progress-bubble--completed` |
| Upcoming | milestone index > active index | `event-card__progress-bubble--upcoming` |
| De-emphasized | `isCancelled` | `event-card__progress-bubble--cancelled` |

## Component integration (`EventCard`)

`EventCard` appends after existing content:

```text
<article class="event-card[--compact]">
  …existing header, date, badges, quick links…
  <EventCardProgressBar
    bookingPlacementStatus={…}
    eventDate={event.eventDate}
    eventId={eventId}
    compact={compact}
  />
</article>
```

Progress bar is **read-only**; does not invoke `onQuickLink` or `onActivate`.

## Accessibility

| Element | Requirement |
|---------|-------------|
| Bar container | `role="progressbar"` with `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label` describing current stage |
| Each bubble | `aria-label="{full milestone label}"`; compact adds tooltip on interaction |
| Cancelled | `aria-label="Cancelled booking — lifecycle progress inactive"` |
