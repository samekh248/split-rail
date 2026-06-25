import { describe, expect, it } from 'vitest';
import { getBookingPreviewLabel, getBookingStatusLabel, BOOKING_PREVIEW_TOOLTIP } from '@/lib/eventCardLabels';

describe('eventCardLabels', () => {
  it('returns label from API booking status', () => {
    expect(getBookingStatusLabel('HOLD_1')).toBe('Hold 1');
    expect(getBookingStatusLabel('CONFIRMED')).toBe('Confirmed');
  });

  it('getBookingPreviewLabel falls back to confirmed', () => {
    expect(getBookingPreviewLabel('event-id')).toBe('Confirmed');
  });

  it('exports booking tooltip copy', () => {
    expect(BOOKING_PREVIEW_TOOLTIP).toContain('Booking placement status');
  });
});
