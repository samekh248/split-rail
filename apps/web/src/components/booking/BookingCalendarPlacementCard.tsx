import type { BookingPlacement, BookingPlacementStatus } from '@/lib/bookingCalendar';
import { placementLegendHighlightClass } from '@/lib/bookingCalendar';
import { formatEventDateRange } from '@/lib/eventDateRange';
import { placementStatusLabel, statusClass } from '@/components/booking/BookingCalendarMatrix';

export interface BookingCalendarPlacementCardProps {
  placement: BookingPlacement;
  onClick: (placement: BookingPlacement) => void;
  variant?: 'default' | 'compact';
  highlightedStatus?: BookingPlacementStatus | null;
}

function formatListDateRange(placement: BookingPlacement): string {
  const [startYear, startMonth, startDay] = placement.eventDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const endKey = placement.endDate && placement.endDate !== placement.eventDate
    ? placement.endDate
    : null;
  if (!endKey) {
    return start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return formatEventDateRange(placement.eventDate, endKey);
}

function formatCompactDateRange(placement: BookingPlacement): string {
  return formatEventDateRange(placement.eventDate, placement.endDate);
}

export function BookingCalendarPlacementCard({
  placement,
  onClick,
  variant = 'default',
  highlightedStatus = null,
}: BookingCalendarPlacementCardProps) {
  const cardClassName = [
    'booking-placement',
    'booking-calendar-list__card',
    statusClass(placement.bookingPlacementStatus),
    placementLegendHighlightClass(placement.bookingPlacementStatus, highlightedStatus),
    variant === 'compact' ? 'booking-calendar-list__card--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (variant === 'compact') {
    const timeLabel = placement.doorsTime ?? 'Time TBD';

    return (
      <button type="button" className={cardClassName} onClick={() => onClick(placement)}>
        <div className="booking-calendar-list__compact-row booking-calendar-list__compact-row--primary">
          <strong className="booking-calendar-list__title">{placement.title}</strong>
          <span className="booking-calendar-list__status">
            {placementStatusLabel(placement.bookingPlacementStatus)}
          </span>
        </div>
        <div className="booking-calendar-list__compact-row booking-calendar-list__compact-row--meta">
          <span className="booking-calendar-list__compact-meta">
            {formatCompactDateRange(placement)} · {timeLabel} · {placement.venueName}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button type="button" className={cardClassName} onClick={() => onClick(placement)}>
      <div className="booking-calendar-list__card-header">
        <div className="booking-calendar-list__card-meta">
          <span className="booking-calendar-list__date">{formatListDateRange(placement)}</span>
          <span className="booking-calendar-list__time">{placement.doorsTime ?? 'Time TBD'}</span>
        </div>
        <span className="booking-calendar-list__status">
          {placementStatusLabel(placement.bookingPlacementStatus)}
        </span>
      </div>
      <strong className="booking-calendar-list__title">{placement.title}</strong>
      <span className="booking-calendar-list__venue">{placement.venueName}</span>
    </button>
  );
}
