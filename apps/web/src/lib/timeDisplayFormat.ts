export const DEFAULT_TIME_DISPLAY_FORMAT = '12h' as const;

export type TimeDisplayFormat =
  | typeof DEFAULT_TIME_DISPLAY_FORMAT
  | '24h';

export interface TimeDisplayFormatOption {
  value: TimeDisplayFormat;
  label: string;
  example: string;
}

export const TIME_DISPLAY_FORMAT_OPTIONS: readonly TimeDisplayFormatOption[] = [
  { value: '12h', label: '12-hour', example: '8:00 PM' },
  { value: '24h', label: '24-hour', example: '20:00' },
];

const ALLOWED_FORMATS = new Set<string>(TIME_DISPLAY_FORMAT_OPTIONS.map((option) => option.value));

let activeTimeDisplayFormat: TimeDisplayFormat = DEFAULT_TIME_DISPLAY_FORMAT;

export function resolveTimeDisplayFormat(value: string | null | undefined): TimeDisplayFormat {
  if (value && ALLOWED_FORMATS.has(value)) {
    return value as TimeDisplayFormat;
  }
  return DEFAULT_TIME_DISPLAY_FORMAT;
}

export function getTimeDisplayFormat(): TimeDisplayFormat {
  return activeTimeDisplayFormat;
}

export function setTimeDisplayFormat(value: string | null | undefined): void {
  activeTimeDisplayFormat = resolveTimeDisplayFormat(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseTimeHhmm(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (hours === 24 && minutes === 0) {
    return { hours: 24, minutes: 0 };
  }

  if (hours < 0 || hours > 23) {
    return null;
  }

  return { hours, minutes };
}

export function formatTimeWithPreference(
  hhmm: string | null | undefined,
  format: TimeDisplayFormat = getTimeDisplayFormat(),
): string {
  if (!hhmm) {
    return '';
  }

  const parsed = parseTimeHhmm(hhmm);
  if (!parsed) {
    return hhmm;
  }

  if (format === '24h') {
    if (parsed.hours === 24) {
      return '24:00';
    }
    return `${pad2(parsed.hours)}:${pad2(parsed.minutes)}`;
  }

  const displayHours = parsed.hours === 24 ? 0 : parsed.hours;
  const date = new Date(2000, 0, 1, displayHours, parsed.minutes);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeRangeWithPreference(
  start: string | null | undefined,
  end: string | null | undefined,
  format: TimeDisplayFormat = getTimeDisplayFormat(),
): string {
  const startLabel = formatTimeWithPreference(start, format);
  const endLabel = formatTimeWithPreference(end, format);
  if (!startLabel && !endLabel) {
    return '';
  }
  if (!startLabel) {
    return endLabel;
  }
  if (!endLabel) {
    return startLabel;
  }
  return `${startLabel}–${endLabel}`;
}

export function formatTimeRangeWithWord(
  start: string | null | undefined,
  end: string | null | undefined,
  format: TimeDisplayFormat = getTimeDisplayFormat(),
): string {
  const startLabel = formatTimeWithPreference(start, format);
  const endLabel = formatTimeWithPreference(end, format);
  if (!startLabel || !endLabel) {
    return '';
  }
  return `${startLabel} to ${endLabel}`;
}

export function formatDateTimeWithPreference(
  iso: string | null | undefined,
  format: TimeDisplayFormat = getTimeDisplayFormat(),
): string {
  if (!iso) {
    return '—';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  });
  return `${datePart}, ${timePart}`;
}
