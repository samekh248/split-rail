export type EventCardProgressMilestone = 'holds' | 'confirmed' | 'eventDate' | 'postEvent';

export interface EventCardProgressPosition {
  activeMilestone: EventCardProgressMilestone | null;
  isCancelled: boolean;
  fillPercent: number;
}

export const EVENT_CARD_PROGRESS_MILESTONES: EventCardProgressMilestone[] = [
  'holds',
  'confirmed',
  'eventDate',
  'postEvent',
];

const FILL_BY_MILESTONE: Record<EventCardProgressMilestone, number> = {
  holds: 12.5,
  confirmed: 37.5,
  eventDate: 62.5,
  postEvent: 100,
};

const MILESTONE_LABELS: Record<EventCardProgressMilestone, string> = {
  holds: 'Holds',
  confirmed: 'Confirmed',
  eventDate: 'Event date',
  postEvent: 'Post-event',
};

const MILESTONE_LABELS_ABBREV: Record<EventCardProgressMilestone, string> = {
  holds: 'Holds',
  confirmed: 'Confirmed',
  eventDate: 'Show',
  postEvent: 'Post',
};

/** Keep fill stops aligned with `.event-card__progress-fill` in index.css. */
export const EVENT_CARD_PROGRESS_FILL_START =
  'color-mix(in srgb, var(--color-primary-brown) 50%, var(--color-bg-cream))';
export const EVENT_CARD_PROGRESS_FILL_END =
  'color-mix(in srgb, var(--color-accent-orange) 78%, var(--color-bg-cream))';
/** Where the fill reaches full orange, as a percentage of bar width. */
export const EVENT_CARD_PROGRESS_ORANGE_FULL_AT = 42;

export function getEventCardProgressGradientWeight(
  milestone: EventCardProgressMilestone,
): number {
  const index = EVENT_CARD_PROGRESS_MILESTONES.indexOf(milestone);
  const linear = index / (EVENT_CARD_PROGRESS_MILESTONES.length - 1);
  return Math.min(100, (linear / (EVENT_CARD_PROGRESS_ORANGE_FULL_AT / 100)) * 100);
}

export function getEventCardProgressFillGradient(): string {
  return `linear-gradient(90deg, ${EVENT_CARD_PROGRESS_FILL_START} 0%, ${EVENT_CARD_PROGRESS_FILL_END} ${EVENT_CARD_PROGRESS_ORANGE_FULL_AT}%, ${EVENT_CARD_PROGRESS_FILL_END} 100%)`;
}

function parseEventDate(eventDate: string | null | undefined): Date | null {
  if (!eventDate) {
    return null;
  }
  const [year, month, day] = eventDate.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function isHoldPlacement(status: string | null | undefined): boolean {
  return status === 'HOLD_1' || status === 'HOLD_2';
}

function isConfirmedPlacement(status: string | null | undefined): boolean {
  return status == null || status === 'CONFIRMED';
}

export function getEventCardProgressLabel(
  milestone: EventCardProgressMilestone,
  abbreviated = false,
): string {
  return abbreviated ? MILESTONE_LABELS_ABBREV[milestone] : MILESTONE_LABELS[milestone];
}

export function getEventCardProgressAriaLabel(position: EventCardProgressPosition): string {
  if (position.isCancelled) {
    return 'Cancelled booking — lifecycle progress inactive';
  }
  if (!position.activeMilestone) {
    return 'Event lifecycle progress';
  }
  return `Event lifecycle: ${MILESTONE_LABELS[position.activeMilestone]}`;
}

export function resolveEventCardProgressPosition(
  bookingPlacementStatus: string | null | undefined,
  eventDate: string | null | undefined,
  now: Date = new Date(),
): EventCardProgressPosition {
  if (bookingPlacementStatus === 'CANCELLED') {
    return {
      activeMilestone: null,
      isCancelled: true,
      fillPercent: 0,
    };
  }

  if (isHoldPlacement(bookingPlacementStatus)) {
    return {
      activeMilestone: 'holds',
      isCancelled: false,
      fillPercent: FILL_BY_MILESTONE.holds,
    };
  }

  if (!isConfirmedPlacement(bookingPlacementStatus)) {
    return {
      activeMilestone: 'confirmed',
      isCancelled: false,
      fillPercent: FILL_BY_MILESTONE.confirmed,
    };
  }

  const parsedDate = parseEventDate(eventDate);
  if (!parsedDate) {
    return {
      activeMilestone: 'confirmed',
      isCancelled: false,
      fillPercent: FILL_BY_MILESTONE.confirmed,
    };
  }

  const today = startOfDay(now);
  const showDay = startOfDay(parsedDate);

  if (isSameCalendarDay(showDay, today)) {
    return {
      activeMilestone: 'eventDate',
      isCancelled: false,
      fillPercent: FILL_BY_MILESTONE.eventDate,
    };
  }

  if (showDay < today) {
    return {
      activeMilestone: 'postEvent',
      isCancelled: false,
      fillPercent: FILL_BY_MILESTONE.postEvent,
    };
  }

  return {
    activeMilestone: 'confirmed',
    isCancelled: false,
    fillPercent: FILL_BY_MILESTONE.confirmed,
  };
}

export function getMilestoneBubbleState(
  milestone: EventCardProgressMilestone,
  position: EventCardProgressPosition,
): 'active' | 'completed' | 'upcoming' | 'cancelled' {
  if (position.isCancelled) {
    return 'cancelled';
  }
  if (!position.activeMilestone) {
    return 'upcoming';
  }

  const activeIndex = EVENT_CARD_PROGRESS_MILESTONES.indexOf(position.activeMilestone);
  const milestoneIndex = EVENT_CARD_PROGRESS_MILESTONES.indexOf(milestone);

  if (milestoneIndex === activeIndex) {
    return 'active';
  }
  if (milestoneIndex < activeIndex) {
    return 'completed';
  }
  return 'upcoming';
}

/** Opaque bubble tone matching the progress fill gradient at this milestone's position. */
export function getMilestoneBarColor(milestone: EventCardProgressMilestone): string {
  const endWeight = getEventCardProgressGradientWeight(milestone);
  const startWeight = 100 - endWeight;

  return `color-mix(in srgb, ${EVENT_CARD_PROGRESS_FILL_START} ${startWeight}%, ${EVENT_CARD_PROGRESS_FILL_END} ${endWeight}%)`;
}
