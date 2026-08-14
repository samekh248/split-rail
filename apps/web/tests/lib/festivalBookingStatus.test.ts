import { describe, expect, it } from 'vitest';
import {
  bookingStatusClass,
  bookingStatusLabel,
  FESTIVAL_BOOKING_STATUSES,
  normalizeBookingStatus,
  toggledBookingStatus,
} from '@/lib/festivalBookingStatus';

describe('festivalBookingStatus', () => {
  it('offers exactly hold and confirmed', () => {
    expect(FESTIVAL_BOOKING_STATUSES).toEqual(['HOLD', 'CONFIRMED']);
  });

  it('treats missing or unknown values as a hold', () => {
    expect(normalizeBookingStatus(undefined)).toBe('HOLD');
    expect(normalizeBookingStatus(null)).toBe('HOLD');
    expect(normalizeBookingStatus('PENCILED')).toBe('HOLD');
    expect(normalizeBookingStatus('CONFIRMED')).toBe('CONFIRMED');
  });

  it('labels each status in plain language', () => {
    expect(bookingStatusLabel('HOLD')).toBe('Hold');
    expect(bookingStatusLabel('CONFIRMED')).toBe('Confirmed');
  });

  it('maps each status to a distinct class', () => {
    expect(bookingStatusClass('HOLD')).toBe('festival-booking-status--hold');
    expect(bookingStatusClass('CONFIRMED')).toBe('festival-booking-status--confirmed');
  });

  it('toggles between hold and confirmed', () => {
    expect(toggledBookingStatus('HOLD')).toBe('CONFIRMED');
    expect(toggledBookingStatus('CONFIRMED')).toBe('HOLD');
  });
});
