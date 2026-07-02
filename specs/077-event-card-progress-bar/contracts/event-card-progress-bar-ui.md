# Contract: Event Card Lifecycle Progress Bar (Frontend)

**Feature**: `077-event-card-progress-bar` | **Extends**: [025-event-card/contracts/event-card-ui.md](../../025-event-card/contracts/event-card-ui.md)  
**Date**: 2026-07-02

Types from `generated-api.ts` and `@/lib/bookingCalendar` only (Constitution VI). No REST changes.

## Component: `EventCardProgressBar`

**Path**: `apps/web/src/components/dashboard/EventCardProgressBar.tsx`

### Props

```typescript
export interface EventCardProgressBarProps {
  eventId: string;
  bookingPlacementStatus?: string | null;
  eventDate?: string | null;
  compact?: boolean;
  now?: Date;
}
```

### Pure helper: `resolveEventCardProgressPosition`

**Path**: `apps/web/src/lib/eventCardProgress.ts`

```typescript
export type EventCardProgressMilestone = 'holds' | 'confirmed' | 'eventDate' | 'postEvent';

export interface EventCardProgressPosition {
  activeMilestone: EventCardProgressMilestone | null;
  isCancelled: boolean;
  fillPercent: number;
}

export function resolveEventCardProgressPosition(
  bookingPlacementStatus: string | null | undefined,
  eventDate: string | null | undefined,
  now?: Date,
): EventCardProgressPosition;
```

Resolution order matches [data-model.md](../data-model.md).

### DOM structure

```text
<div
  class="event-card__progress[ event-card__progress--compact][ event-card__progress--cancelled]"
  role="progressbar"
  aria-valuenow="{fillPercent}"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="{stage description}"
  data-testid="event-card-progress-{eventId}"
>
  <div class="event-card__progress-track">
    <div class="event-card__progress-fill" style="width: {fillPercent}%" />
  </div>
  <ol class="event-card__progress-milestones" aria-hidden="false">
    {MILESTONES.map →
      <li class="event-card__progress-milestone">
        <button
          type="button"
          class="event-card__progress-bubble event-card__progress-bubble--{active|completed|upcoming|cancelled}"
          aria-label="{full label}"
          data-testid="event-card-progress-bubble-{milestone}-{eventId}"
        />
        {!compact && <span class="event-card__progress-label">{label}</span>}
        {compact && openTooltipId === milestone &&
          <span class="event-card__progress-tooltip" role="tooltip">{full label}</span>}
      </li>
    }
  </ol>
</div>
```

Bubbles use `<button type="button">` for focus/tap without submitting forms. Click on bubble in compact mode toggles tooltip; does not propagate to card `onActivate`.

### Fill percent mapping

| Active milestone | `fillPercent` |
|------------------|---------------|
| `holds` | 12.5 (first stop) |
| `confirmed` | 37.5 |
| `eventDate` | 62.5 |
| `postEvent` | 100 |
| cancelled (`null`) | 0 |

Exact percentages may adjust ±2.5 for visual centering on bubbles; tests assert milestone class, not pixel width.

### CSS tokens (required)

```css
.event-card__progress-fill {
  background: linear-gradient(
    90deg,
    var(--color-accent-orange),
    var(--color-primary-brown)
  );
}
.event-card__progress-track {
  background: var(--color-surface-muted);
}
```

No raw hex outside existing `:root` tokens.

### `EventCard` integration

`EventCard.tsx` renders `<EventCardProgressBar />` as the **last child** of `<article class="event-card">`, after quick links (full) or meta row (compact).

Existing booking badge, variance, and quick links unchanged (FR-010).

### Test IDs

| Element | Pattern |
|---------|---------|
| Progress bar | `event-card-progress-{eventId}` |
| Bubble | `event-card-progress-bubble-{milestone}-{eventId}` |
| Tooltip (compact) | `event-card-progress-tooltip-{milestone}-{eventId}` |

### Milestone fixture expectations

| Fixture | `bookingPlacementStatus` | `eventDate` | Active bubble |
|---------|--------------------------|-------------|---------------|
| Hold 1 | `HOLD_1` | future | holds |
| Hold 2 | `HOLD_2` | future | holds (same position as Hold 1) |
| Confirmed upcoming | `CONFIRMED` | future | confirmed |
| Show day | `CONFIRMED` | today | eventDate |
| Post-event | `CONFIRMED` | past | postEvent |
| Legacy | `null` | past | postEvent |
| No date | `CONFIRMED` | `null` | confirmed |
| Cancelled | `CANCELLED` | any | none (all de-emphasized) |
| Hold on show day | `HOLD_1` | today | holds |
