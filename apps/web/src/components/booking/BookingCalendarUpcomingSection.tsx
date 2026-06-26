import type { BookingPlacement, BookingPlacementStatus } from '@/lib/bookingCalendar';
import { BookingCalendarPlacementCard } from '@/components/booking/BookingCalendarPlacementCard';

export interface BookingCalendarUpcomingSectionProps {
  month: string;
  placements: BookingPlacement[];
  highlightedStatus?: BookingPlacementStatus | null;
  onPlacementClick: (placement: BookingPlacement) => void;
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function BookingCalendarUpcomingSection({
  month,
  placements,
  highlightedStatus = null,
  onPlacementClick,
}: BookingCalendarUpcomingSectionProps) {
  const monthLabel = formatMonthLabel(month);

  return (
    <section className="booking-calendar-upcoming" data-testid="booking-calendar-upcoming">
      <h2 className="booking-calendar-upcoming__title">Upcoming after {monthLabel}</h2>
      {placements.length === 0 ? (
        <p className="booking-calendar-upcoming__empty">No upcoming events after this month.</p>
      ) : (
        <ul className="booking-calendar-upcoming__items">
          {placements.map((placement) => (
            <li key={placement.eventId} className="booking-calendar-list__item">
              <BookingCalendarPlacementCard
                placement={placement}
                highlightedStatus={highlightedStatus}
                onClick={onPlacementClick}
                variant="compact"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
