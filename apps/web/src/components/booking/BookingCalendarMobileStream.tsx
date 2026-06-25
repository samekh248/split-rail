import { sortAgendaPlacements, type BookingPlacement } from '@/lib/bookingCalendar';
import { placementStatusLabel, statusClass } from '@/components/booking/BookingCalendarMatrix';

export interface BookingCalendarMobileStreamProps {
  days: string[];
  placementsByDate: Record<string, BookingPlacement[]>;
  onPlacementClick: (placement: BookingPlacement) => void;
}

export function BookingCalendarMobileStream({
  days,
  placementsByDate,
  onPlacementClick,
}: BookingCalendarMobileStreamProps) {
  return (
    <div className="booking-calendar-mobile" data-testid="booking-calendar-mobile">
      {days.map((dateKey) => {
        const dayPlacements = placementsByDate[dateKey] ?? [];
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
                  <button
                    type="button"
                    className={`booking-placement booking-calendar-mobile__event ${statusClass(placement.bookingPlacementStatus)}`}
                    onClick={() => onPlacementClick(placement)}
                  >
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
