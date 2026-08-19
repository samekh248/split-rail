import { addLocalDays, parseEventLocalDate, toDateKey } from '@/lib/upcomingEventsCalendar';
import {
  formatDateLabelFromIso,
  formatDateRangeFromIso,
  formatDateRangeLongFromIso,
} from '@/lib/dateDisplayFormat';

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

/**
 * The three formatters below delegate to the shared date-display helpers so every event
 * surface honours the signed-in user's chosen format. They keep `effectiveEndDate` in front
 * of the range helpers, which tolerates an end date that precedes the start.
 */

export function formatEventDateLabel(eventDate: string | null | undefined): string {
  return formatDateLabelFromIso(eventDate);
}

/** Compact range in the user's date format, e.g. "08/14/2026 – 08/16/2026". */
export function formatEventDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  return formatDateRangeFromIso(startDate, effectiveEndDate(startDate, endDate));
}

/** Detail-view range with weekdays, e.g. "Mon, 06/15/2026 – Wed, 06/17/2026". */
export function formatEventDateRangeLong(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  return formatDateRangeLongFromIso(startDate, effectiveEndDate(startDate, endDate));
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
