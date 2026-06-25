import type { BookingPlacementStatus } from '@/lib/bookingCalendar';
import { formatBookingStatusLabel } from '@/lib/bookingCalendar';

export function getBookingStatusLabel(
  status: string | null | undefined,
  _eventId?: string,
): string {
  if (status) {
    return formatBookingStatusLabel(status as BookingPlacementStatus);
  }
  return 'Confirmed';
}

/** @deprecated Use getBookingStatusLabel with API bookingPlacementStatus */
export function getBookingPreviewLabel(eventId: string | undefined): string {
  return getBookingStatusLabel('CONFIRMED', eventId);
}

export const BOOKING_PREVIEW_TOOLTIP = 'Booking placement status';

export function eventCardBookingBadgeClass(status: BookingPlacementStatus): string {
  switch (status) {
    case 'CANCELLED':
      return 'event-card__booking-badge--cancelled';
    case 'CONFIRMED':
      return 'event-card__booking-badge--confirmed';
    case 'HOLD_2':
      return 'event-card__booking-badge--hold-2';
    default:
      return 'event-card__booking-badge--hold-1';
  }
}
