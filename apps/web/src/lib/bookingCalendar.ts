import {
  addLocalDays,
  startOfLocalDay,
  toDateKey,
} from '@/lib/upcomingEventsCalendar';

export { toDateKey };

export type BookingPlacementStatus = 'HOLD_1' | 'HOLD_2' | 'CONFIRMED' | 'CANCELLED';

export interface BookingPlacement {
  eventId: string;
  venueId: string;
  venueName: string;
  regionId: string | null;
  regionName: string | null;
  title: string;
  eventDate: string;
  bookingPlacementStatus: BookingPlacementStatus;
  doorsTime: string | null;
  loadInTime?: string | null;
  curfewTime?: string | null;
  supportLineup?: string | null;
  workspaceAllowed: boolean;
}

export interface CalendarViewContext {
  viewMode: 'global' | 'regional' | 'venue';
  regionId: string | null;
  venueId: string | null;
  month: string;
  showCancelled: boolean;
}

export interface MonthBounds {
  from: string;
  to: string;
}

export type ConflictPreviewAction =
  | { type: 'createHold' }
  | { type: 'createConfirmed' }
  | { type: 'promoteToConfirmed'; excludeEventId?: string };

export interface ConflictPreviewResult {
  allowed: boolean;
  tier?: BookingPlacementStatus;
  reason?: string;
}

const ACTIVE_STATUSES: BookingPlacementStatus[] = ['HOLD_1', 'HOLD_2', 'CONFIRMED'];

function getActivePlacements(
  placements: BookingPlacement[],
  excludeEventId?: string,
): BookingPlacement[] {
  return placements.filter(
    (p) =>
      ACTIVE_STATUSES.includes(p.bookingPlacementStatus)
      && p.eventId !== excludeEventId,
  );
}

export function getMonthBounds(month: string): MonthBounds {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
  };
}

export function groupPlacementsByDate(
  placements: BookingPlacement[],
): Record<string, BookingPlacement[]> {
  const grouped: Record<string, BookingPlacement[]> = {};

  for (const placement of placements) {
    if (!grouped[placement.eventDate]) {
      grouped[placement.eventDate] = [];
    }
    grouped[placement.eventDate]!.push(placement);
  }

  for (const dateKey of Object.keys(grouped)) {
    grouped[dateKey] = sortAgendaPlacements(grouped[dateKey]!);
  }

  return grouped;
}

export function groupPlacementsByDateAndVenue(
  placements: BookingPlacement[],
): Record<string, Record<string, BookingPlacement[]>> {
  const grouped: Record<string, Record<string, BookingPlacement[]>> = {};

  for (const placement of placements) {
    if (!grouped[placement.eventDate]) {
      grouped[placement.eventDate] = {};
    }
    if (!grouped[placement.eventDate]![placement.venueId]) {
      grouped[placement.eventDate]![placement.venueId] = [];
    }
    grouped[placement.eventDate]![placement.venueId]!.push(placement);
  }

  return grouped;
}

export function previewConflict(
  placements: BookingPlacement[],
  action: ConflictPreviewAction,
): ConflictPreviewResult {
  const excludeEventId = action.type === 'promoteToConfirmed' ? action.excludeEventId : undefined;
  const active = getActivePlacements(placements, excludeEventId);

  if (action.type === 'createHold') {
    if (active.length === 0) {
      return { allowed: true, tier: 'HOLD_1' };
    }
    if (active.length === 1 && active[0]!.bookingPlacementStatus === 'HOLD_1') {
      return { allowed: true, tier: 'HOLD_2' };
    }
    if (
      active.some((p) => p.bookingPlacementStatus === 'CONFIRMED')
      && !active.some((p) => p.bookingPlacementStatus === 'HOLD_2')
    ) {
      return { allowed: true, tier: 'HOLD_2' };
    }
    return { allowed: false, reason: 'A hold cannot be created on this date.' };
  }

  if (action.type === 'createConfirmed' || action.type === 'promoteToConfirmed') {
    if (active.some((p) => p.bookingPlacementStatus === 'CONFIRMED')) {
      return { allowed: false, reason: 'A confirmed booking already exists on this date.' };
    }
    if (action.type === 'createConfirmed') {
      if (active.length === 0) {
        return { allowed: true };
      }
      if (
        active.length === 2
        && active.some((p) => p.bookingPlacementStatus === 'HOLD_1')
        && active.some((p) => p.bookingPlacementStatus === 'HOLD_2')
      ) {
        return { allowed: true };
      }
      if (
        active.length === 1
        && (active[0]!.bookingPlacementStatus === 'HOLD_1'
          || active[0]!.bookingPlacementStatus === 'HOLD_2')
      ) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'A confirmed booking cannot be created on this date.' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unknown action.' };
}

export function sortAgendaPlacements(placements: BookingPlacement[]): BookingPlacement[] {
  return [...placements].sort((a, b) => {
    if (a.doorsTime && b.doorsTime) {
      const timeCompare = a.doorsTime.localeCompare(b.doorsTime);
      if (timeCompare !== 0) {
        return timeCompare;
      }
    } else if (a.doorsTime && !b.doorsTime) {
      return -1;
    } else if (!a.doorsTime && b.doorsTime) {
      return 1;
    }
    return a.venueName.localeCompare(b.venueName);
  });
}

export function filterPlacementsByView(
  placements: BookingPlacement[],
  context: CalendarViewContext,
): BookingPlacement[] {
  return placements.filter((placement) => {
    if (!context.showCancelled && placement.bookingPlacementStatus === 'CANCELLED') {
      return false;
    }
    if (context.viewMode === 'regional' && context.regionId) {
      return placement.regionId === context.regionId;
    }
    if (context.viewMode === 'venue' && context.venueId) {
      return placement.venueId === context.venueId;
    }
    return true;
  });
}

export function getCalendarDaysForMonth(month: string): Date[] {
  const [year, monthNum] = month.split('-').map(Number);
  const first = new Date(year, monthNum - 1, 1);
  const last = new Date(year, monthNum, 0);
  const days: Date[] = [];
  let cursor = startOfLocalDay(first);
  const end = startOfLocalDay(last);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addLocalDays(cursor, 1);
  }
  return days;
}

export interface MonthCalendarDayCell {
  date: Date;
  dateKey: string;
  isAdjacentMonth: boolean;
}

export interface MonthCalendarWeekRow {
  days: MonthCalendarDayCell[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function getWeekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS;
}

export function buildMonthCalendarWeeks(month: string): MonthCalendarWeekRow[] {
  const [year, monthNum] = month.split('-').map(Number);
  const anchorMonth = monthNum - 1;
  const firstOfMonth = new Date(year, anchorMonth, 1);
  const lastOfMonth = new Date(year, anchorMonth + 1, 0);

  let cursor = startOfLocalDay(firstOfMonth);
  cursor = addLocalDays(cursor, -cursor.getDay());

  let gridEnd = startOfLocalDay(lastOfMonth);
  const endDayOfWeek = gridEnd.getDay();
  if (endDayOfWeek !== 6) {
    gridEnd = addLocalDays(gridEnd, 6 - endDayOfWeek);
  }

  const weeks: MonthCalendarWeekRow[] = [];
  let currentWeek: MonthCalendarDayCell[] = [];

  while (cursor <= gridEnd) {
    currentWeek.push({
      date: new Date(cursor),
      dateKey: toDateKey(cursor),
      isAdjacentMonth: cursor.getMonth() !== anchorMonth,
    });

    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }

    cursor = addLocalDays(cursor, 1);
  }

  return weeks;
}

export function formatBookingStatusLabel(status: BookingPlacementStatus): string {
  switch (status) {
    case 'HOLD_1':
      return 'Hold 1';
    case 'HOLD_2':
      return 'Hold 2';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}
