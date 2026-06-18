const BOOKING_PREVIEW_LABELS = ['Hold 1', 'Hold 2', 'Confirmed'] as const;

/** Placeholder booking badge label per TDD §4.3 (deterministic from event id). */
export function getBookingPreviewLabel(eventId: string | undefined): string {
  if (!eventId) {
    return BOOKING_PREVIEW_LABELS[0];
  }

  let hash = 0;
  for (const char of eventId) {
    hash = (hash + char.charCodeAt(0)) % BOOKING_PREVIEW_LABELS.length;
  }
  return BOOKING_PREVIEW_LABELS[hash]!;
}

export const BOOKING_PREVIEW_TOOLTIP =
  'Booking status preview — full calendar coming soon';
