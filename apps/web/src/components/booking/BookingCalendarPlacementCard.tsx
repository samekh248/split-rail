import { placementStatusLabel, statusClass } from '@/components/booking/BookingCalendarMatrix';
import type { BookingPlacement } from '@/lib/bookingCalendar';

export interface BookingCalendarPlacementCardProps {
  placement: BookingPlacement;
  onClick: (placement: BookingPlacement) => void;
  variant?: 'default' | 'compact';
}

function formatListDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCompactDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function BookingCalendarPlacementCard({
  placement,
  onClick,
  variant = 'default',
}: BookingCalendarPlacementCardProps) {
  const cardClassName = [
    'booking-placement',
    'booking-calendar-list__card',
    statusClass(placement.bookingPlacementStatus),
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
            {formatCompactDate(placement.eventDate)} · {timeLabel} · {placement.venueName}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button type="button" className={cardClassName} onClick={() => onClick(placement)}>
      <div className="booking-calendar-list__card-header">
        <div className="booking-calendar-list__card-meta">
          <span className="booking-calendar-list__date">{formatListDate(placement.eventDate)}</span>
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
