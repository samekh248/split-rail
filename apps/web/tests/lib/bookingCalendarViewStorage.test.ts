import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearBookingCalendarDisplayModeCookie,
  readBookingCalendarDisplayMode,
  writeBookingCalendarDisplayMode,
} from '@/lib/bookingCalendarViewStorage';

describe('bookingCalendarViewStorage', () => {
  beforeEach(() => {
    clearBookingCalendarDisplayModeCookie();
  });

  it('returns null when no display mode cookie is set', () => {
    expect(readBookingCalendarDisplayMode()).toBeNull();
  });

  it('persists calendar display mode in a cookie', () => {
    writeBookingCalendarDisplayMode('calendar');
    expect(readBookingCalendarDisplayMode()).toBe('calendar');
  });

  it('persists list display mode in a cookie', () => {
    writeBookingCalendarDisplayMode('list');
    expect(readBookingCalendarDisplayMode()).toBe('list');
  });

  it('ignores invalid cookie values', () => {
    document.cookie = 'bookingCalendarDisplayMode=grid; Path=/; SameSite=Lax';
    expect(readBookingCalendarDisplayMode()).toBeNull();
  });
});
