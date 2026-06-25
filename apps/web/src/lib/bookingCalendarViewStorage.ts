import type { CalendarViewContext } from '@/lib/bookingCalendar';

const DISPLAY_MODE_COOKIE = 'bookingCalendarDisplayMode';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
}

export function clearBookingCalendarDisplayModeCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${DISPLAY_MODE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function readBookingCalendarDisplayMode(): CalendarViewContext['displayMode'] | null {
  const value = readCookie(DISPLAY_MODE_COOKIE);
  if (value === 'calendar' || value === 'list') {
    return value;
  }
  return null;
}

export function writeBookingCalendarDisplayMode(mode: CalendarViewContext['displayMode']): void {
  writeCookie(DISPLAY_MODE_COOKIE, mode);
}
