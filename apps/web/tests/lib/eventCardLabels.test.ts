import { describe, expect, it } from 'vitest';
import { getBookingPreviewLabel, BOOKING_PREVIEW_TOOLTIP } from '@/lib/eventCardLabels';
import { EVENT_A } from '../fixtures/events';

describe('eventCardLabels', () => {
  it('returns deterministic placeholder label from event id', () => {
    const label = getBookingPreviewLabel(EVENT_A.eventId);
    expect(['Hold 1', 'Hold 2', 'Confirmed']).toContain(label);
    expect(getBookingPreviewLabel(EVENT_A.eventId)).toBe(label);
  });

  it('defaults when event id missing', () => {
    expect(getBookingPreviewLabel(undefined)).toBe('Hold 1');
  });

  it('exports booking preview tooltip copy', () => {
    expect(BOOKING_PREVIEW_TOOLTIP).toContain('full calendar coming soon');
  });
});
