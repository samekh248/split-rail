import {
  sortAgendaPlacements,
  placementLegendHighlightClass,
  placementStatusClass,
  type BookingPlacement,
  type BookingPlacementStatus,
} from '@/lib/bookingCalendar';
import { placementStatusLabel } from '@/components/booking/BookingCalendarMatrix';

export interface BookingCalendarMobileStreamProps {
  days: string[];
  placementsByDate: Record<string, BookingPlacement[]>;
  highlightedStatus?: BookingPlacementStatus | null;
  onPlacementClick: (placement: BookingPlacement) => void;
}

export function BookingCalendarMobileStream({
  days,
  placementsByDate,
  highlightedStatus = null,
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
            <h3 className="booking-calendar-mobile__day-label">{dateKey}</h3>
            <ul className="booking-calendar-mobile__events">
              {sorted.map((placement) => (
                <li key={placement.eventId}>
                  <button
                    type="button"
                    className={[
                      'booking-placement',
                      'booking-calendar-mobile__event',
                      placementStatusClass(placement.bookingPlacementStatus),
                      placementLegendHighlightClass(
                        placement.bookingPlacementStatus,
                        highlightedStatus,
                      ),
                    ]
                      .filter(Boolean)
                      .join(' ')}
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
