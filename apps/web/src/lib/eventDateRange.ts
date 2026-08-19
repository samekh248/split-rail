import { addLocalDays, parseEventLocalDate, toDateKey } from '@/lib/upcomingEventsCalendar';

export function effectiveEndDate(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = startDate ?? '';
  if (endDate && (!start || endDate >= start)) {
    return endDate;
  }
  return start;
}

export function eachDateKey(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string[] {
  const start = parseEventLocalDate(startDate);
  if (!start) {
    return [];
  }

  const last = parseEventLocalDate(effectiveEndDate(startDate, endDate)) ?? start;
  const keys: string[] = [];
  let cursor = start;
  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor = addLocalDays(cursor, 1);
  }
  return keys;
}

export function formatEventDateLabel(eventDate: string | null | undefined): string {
  const parsed = parseEventLocalDate(eventDate);
  if (!parsed) {
    return 'Date TBD';
  }
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLongDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-US', options);
}

/** Compact locale range, e.g. "Aug 14–16, 2026" or "Aug 30 – Sep 1, 2026". */
export function formatEventDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = parseEventLocalDate(startDate);
  if (!start) {
    return 'Date TBD';
  }

  const last = parseEventLocalDate(effectiveEndDate(startDate, endDate));
  if (!last || toDateKey(last) === toDateKey(start)) {
    return formatEventDateLabel(startDate);
  }

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = last.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = last.getDate();
  const startYear = start.getFullYear();
  const endYear = last.getFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${endYear}`;
  }
  if (startYear === endYear) {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;
  }
  return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

/** Detail-view range, e.g. "Fri, June 15 – Sun, June 17, 2026". */
export function formatEventDateRangeLong(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = parseEventLocalDate(startDate);
  if (!start) {
    return 'Date TBD';
  }

  const last = parseEventLocalDate(effectiveEndDate(startDate, endDate));
  if (!last || toDateKey(last) === toDateKey(start)) {
    return formatLongDate(start, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const sameYear = start.getFullYear() === last.getFullYear();
  const startLabel = formatLongDate(start, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const endLabel = formatLongDate(last, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

/** ISO range for compact lists, e.g. "2026-08-14 – 2026-08-16". */
export function formatIsoDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = startDate ?? '';
  if (!start) {
    return 'Date TBD';
  }
  const last = effectiveEndDate(startDate, endDate);
  return last && last !== start ? `${start} – ${last}` : start;
}
