import { BOOKING_PLACEMENT_LEGEND, type BookingPlacementStatus } from '@/lib/bookingCalendar';

const LEGEND_SWATCH_CLASS: Record<BookingPlacementStatus, string> = {
  CONFIRMED: 'booking-calendar-legend__swatch--confirmed',
  HOLD_1: 'booking-calendar-legend__swatch--hold-1',
  HOLD_2: 'booking-calendar-legend__swatch--hold-2',
  CANCELLED: 'booking-calendar-legend__swatch--cancelled',
};

export interface BookingCalendarLegendProps {
  showCancelled?: boolean;
  highlightedStatus?: BookingPlacementStatus | null;
  onHighlightStatus?: (status: BookingPlacementStatus | null) => void;
}

export function BookingCalendarLegend({
  showCancelled = false,
  highlightedStatus = null,
  onHighlightStatus,
}: BookingCalendarLegendProps) {
  const items = showCancelled
    ? BOOKING_PLACEMENT_LEGEND
    : BOOKING_PLACEMENT_LEGEND.filter((item) => item.status !== 'CANCELLED');

  return (
    <div
      className="booking-calendar-legend"
      data-testid="booking-calendar-legend"
      role="note"
      onMouseLeave={() => onHighlightStatus?.(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onHighlightStatus?.(null);
        }
      }}
    >
      <span className="booking-calendar-legend__heading">Legend</span>
      <ul className="booking-calendar-legend__items">
        {items.map((item) => {
          const isActive = highlightedStatus === item.status;

          return (
            <li key={item.status} className="booking-calendar-legend__entry">
              <button
                type="button"
                className={[
                  'booking-calendar-legend__item',
                  isActive ? 'booking-calendar-legend__item--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-testid={`booking-calendar-legend-${item.status}`}
                aria-pressed={isActive}
                aria-label={`Highlight ${item.label} events`}
                onMouseEnter={() => onHighlightStatus?.(item.status)}
                onFocus={() => onHighlightStatus?.(item.status)}
              >
                <span
                  className={`booking-calendar-legend__swatch ${LEGEND_SWATCH_CLASS[item.status]}`}
                  aria-hidden="true"
                />
                <span className="booking-calendar-legend__label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
