import type { EventCardDto } from '@/types/generated-api';

export interface UpcomingWindowBounds {
  start: Date;
  end: Date;
}

export interface CalendarDayCell {
  date: Date;
  dateKey: string;
  inWindow: boolean;
  isAdjacentMonth: boolean;
}

export interface CalendarWeekRow {
  days: CalendarDayCell[];
}

const DEFAULT_TITLE_MAX = 24;

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfLocalDay(next);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getUpcomingWindowBounds(now: Date = new Date()): UpcomingWindowBounds {
  const today = startOfLocalDay(now);
  return {
    start: addLocalDays(today, 1),
    end: addLocalDays(today, 30),
  };
}

export function isDateInUpcomingWindow(date: Date, bounds: UpcomingWindowBounds): boolean {
  const normalized = startOfLocalDay(date);
  return normalized >= bounds.start && normalized <= bounds.end;
}

export function parseEventLocalDate(eventDate: string | null | undefined): Date | null {
  if (!eventDate) {
    return null;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, month, day);
  }

  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return startOfLocalDay(parsed);
}

export function truncateEventTitle(
  title: string | null | undefined,
  maxLen: number = DEFAULT_TITLE_MAX,
): string {
  const label = title?.trim() || 'Untitled event';
  if (label.length <= maxLen) {
    return label;
  }
  return `${label.slice(0, maxLen - 1)}…`;
}

export function groupEventsByLocalDate(events: EventCardDto[]): Map<string, EventCardDto[]> {
  const grouped = new Map<string, EventCardDto[]>();

  for (const event of events) {
    const localDate = parseEventLocalDate(event.eventDate);
    if (!localDate) {
      continue;
    }
    const key = toDateKey(localDate);
    const existing = grouped.get(key) ?? [];
    existing.push(event);
    grouped.set(key, existing);
  }

  return grouped;
}

export function buildMiniCalendarWeeks(now: Date = new Date()): CalendarWeekRow[] {
  const bounds = getUpcomingWindowBounds(now);
  const anchorMonth = now.getMonth();
  const anchorYear = now.getFullYear();
  const firstOfMonth = new Date(anchorYear, anchorMonth, 1);
  const lastOfMonth = new Date(anchorYear, anchorMonth + 1, 0);

  const gridEndTarget = bounds.end > lastOfMonth ? bounds.end : lastOfMonth;

  let cursor = startOfLocalDay(firstOfMonth);
  cursor = addLocalDays(cursor, -cursor.getDay());

  let gridEnd = startOfLocalDay(gridEndTarget);
  const endDayOfWeek = gridEnd.getDay();
  if (endDayOfWeek !== 6) {
    gridEnd = addLocalDays(gridEnd, 6 - endDayOfWeek);
  }

  const weeks: CalendarWeekRow[] = [];
  let currentWeek: CalendarDayCell[] = [];

  while (cursor <= gridEnd) {
    currentWeek.push({
      date: new Date(cursor),
      dateKey: toDateKey(cursor),
      inWindow: isDateInUpcomingWindow(cursor, bounds),
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
