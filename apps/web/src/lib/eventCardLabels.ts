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
