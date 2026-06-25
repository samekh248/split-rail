import { sortAgendaPlacements, type BookingPlacement } from '@/lib/bookingCalendar';
import { placementStatusLabel } from '@/components/booking/BookingCalendarMatrix';

export interface BookingCalendarMobileStreamProps {
  days: string[];
  grouped: Record<string, Record<string, BookingPlacement[]>>;
  onPlacementClick: (placement: BookingPlacement) => void;
}

export function BookingCalendarMobileStream({
  days,
  grouped,
  onPlacementClick,
}: BookingCalendarMobileStreamProps) {
  return (
    <div className="booking-calendar-mobile" data-testid="booking-calendar-mobile">
      {days.map((dateKey) => {
        const dayPlacements = Object.values(grouped[dateKey] ?? {}).flat();
        if (dayPlacements.length === 0) {
          return null;
        }
        const sorted = sortAgendaPlacements(dayPlacements);
        return (
          <section key={dateKey} className="booking-calendar-mobile__day">
            <h3>{dateKey}</h3>
            <ul>
              {sorted.map((placement) => (
                <li key={placement.eventId}>
                  <button type="button" onClick={() => onPlacementClick(placement)}>
                    <span>{placement.doorsTime ?? 'Time TBD'}</span>
                    <strong>{placement.title}</strong>
                    <span>{placement.venueName}</span>
                    <span>{placementStatusLabel(placement.bookingPlacementStatus)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
