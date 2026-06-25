import { useMemo } from 'react';
import { sortPlacementsForList, type BookingPlacement } from '@/lib/bookingCalendar';
import { BookingCalendarPlacementCard } from '@/components/booking/BookingCalendarPlacementCard';

export interface BookingCalendarListViewProps {
  placements: BookingPlacement[];
  onPlacementClick: (placement: BookingPlacement) => void;
}

export function BookingCalendarListView({
  placements,
  onPlacementClick,
}: BookingCalendarListViewProps) {
  const sorted = useMemo(() => sortPlacementsForList(placements), [placements]);

  if (sorted.length === 0) {
    return (
      <div className="booking-calendar-list booking-calendar-list--empty" data-testid="booking-calendar-list">
        <p>No events this month.</p>
      </div>
    );
  }

  return (
    <div className="booking-calendar-list" data-testid="booking-calendar-list">
      <ul className="booking-calendar-list__items">
        {sorted.map((placement) => (
          <li key={placement.eventId} className="booking-calendar-list__item">
            <BookingCalendarPlacementCard placement={placement} onClick={onPlacementClick} />
          </li>
        ))}
      </ul>
    </div>
  );
}
