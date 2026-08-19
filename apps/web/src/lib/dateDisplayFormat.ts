import { parseEventLocalDate, toDateKey } from '@/lib/upcomingEventsCalendar';

export const DEFAULT_DATE_DISPLAY_FORMAT = 'MM/dd/yyyy' as const;

export type DateDisplayFormat =
  | typeof DEFAULT_DATE_DISPLAY_FORMAT
  | 'dd/MM/yyyy'
  | 'yyyy-MM-dd'
  | 'MMM d, yyyy';

export interface DateDisplayFormatOption {
  value: DateDisplayFormat;
  label: string;
  example: string;
}

export const DATE_DISPLAY_FORMAT_OPTIONS: readonly DateDisplayFormatOption[] = [
  { value: 'MM/dd/yyyy', label: 'MM/dd/YYYY', example: '08/14/2026' },
  { value: 'dd/MM/yyyy', label: 'dd/MM/YYYY', example: '14/08/2026' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd', example: '2026-08-14' },
  { value: 'MMM d, yyyy', label: 'MMM d, yyyy', example: 'Aug 14, 2026' },
];

const ALLOWED_FORMATS = new Set<string>(DATE_DISPLAY_FORMAT_OPTIONS.map((option) => option.value));

let activeDateDisplayFormat: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT;

export function resolveDateDisplayFormat(value: string | null | undefined): DateDisplayFormat {
  if (value && ALLOWED_FORMATS.has(value)) {
    return value as DateDisplayFormat;
  }
  return DEFAULT_DATE_DISPLAY_FORMAT;
}

export function getDateDisplayFormat(): DateDisplayFormat {
  return activeDateDisplayFormat;
}

export function setDateDisplayFormat(value: string | null | undefined): void {
  activeDateDisplayFormat = resolveDateDisplayFormat(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateWithPreference(
  date: Date,
  format: DateDisplayFormat = getDateDisplayFormat(),
): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  switch (format) {
    case 'MM/dd/yyyy':
      return `${pad2(month)}/${pad2(day)}/${year}`;
    case 'dd/MM/yyyy':
      return `${pad2(day)}/${pad2(month)}/${year}`;
    case 'yyyy-MM-dd':
      return toDateKey(date);
    case 'MMM d, yyyy':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    default:
      return `${pad2(month)}/${pad2(day)}/${year}`;
  }
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatDateLabelFromIso(
  eventDate: string | null | undefined,
  format: DateDisplayFormat = getDateDisplayFormat(),
): string {
  const parsed = parseEventLocalDate(eventDate);
  if (!parsed) {
    return 'Date TBD';
  }
  return formatDateWithPreference(parsed, format);
}

export function formatDateRangeFromIso(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  format: DateDisplayFormat = getDateDisplayFormat(),
): string {
  const start = parseEventLocalDate(startDate);
  if (!start) {
    return 'Date TBD';
  }

  const last = parseEventLocalDate(endDate ?? startDate);
  if (!last || toDateKey(last) === toDateKey(start)) {
    return formatDateWithPreference(start, format);
  }

  if (format === 'MMM d, yyyy') {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = last.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = last.getDate();
    const startYear = start.getFullYear();
    const endYear = last.getFullYear();

    if (startYear === endYear && startMonth === endMonth) {
      return `${startMonth} ${startDay}–${endDay}, ${startYear}`;
    }
    if (startYear === endYear) {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
  }

  return `${formatDateWithPreference(start, format)} – ${formatDateWithPreference(last, format)}`;
}

export function formatDateRangeLongFromIso(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  format: DateDisplayFormat = getDateDisplayFormat(),
): string {
  const start = parseEventLocalDate(startDate);
  if (!start) {
    return 'Date TBD';
  }

  const last = parseEventLocalDate(endDate ?? startDate);
  if (!last || toDateKey(last) === toDateKey(start)) {
    return `${formatWeekdayShort(start)}, ${formatDateWithPreference(start, format)}`;
  }

  const startLabel = `${formatWeekdayShort(start)}, ${formatDateWithPreference(start, format)}`;
  const endLabel = `${formatWeekdayShort(last)}, ${formatDateWithPreference(last, format)}`;
  return `${startLabel} – ${endLabel}`;
}
