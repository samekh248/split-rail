export const FESTIVAL_BOOKING_STATUSES = ['HOLD', 'CONFIRMED'] as const;

export type FestivalBookingStatus = (typeof FESTIVAL_BOOKING_STATUSES)[number];

/** Anything unrecognised (including a missing value) reads as a hold, never as a commitment. */
export function normalizeBookingStatus(
  value: string | null | undefined,
): FestivalBookingStatus {
  return value === 'CONFIRMED' ? 'CONFIRMED' : 'HOLD';
}

export function bookingStatusLabel(value: string | null | undefined): string {
  return normalizeBookingStatus(value) === 'CONFIRMED' ? 'Confirmed' : 'Hold';
}

export function bookingStatusClass(value: string | null | undefined): string {
  return normalizeBookingStatus(value) === 'CONFIRMED'
    ? 'festival-booking-status--confirmed'
    : 'festival-booking-status--hold';
}

export function toggledBookingStatus(
  value: string | null | undefined,
): FestivalBookingStatus {
  return normalizeBookingStatus(value) === 'CONFIRMED' ? 'HOLD' : 'CONFIRMED';
}
