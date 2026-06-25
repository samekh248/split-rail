import type { BookingPlacement } from '@/lib/bookingCalendar';
import { formatBookingStatusLabel } from '@/lib/bookingCalendar';

const MAX_VISIBLE = 3;

export interface BookingCalendarMatrixProps {
  days: string[];
  venues: { id: string; name: string; regionName: string | null }[];
  grouped: Record<string, Record<string, BookingPlacement[]>>;
  onDateClick: (dateKey: string) => void;
  onPlacementClick: (placement: BookingPlacement) => void;
  onCellQuickAdd: (dateKey: string, venueId: string) => void;
}

function statusClass(status: BookingPlacement['bookingPlacementStatus']): string {
  if (status === 'CANCELLED') {
    return 'booking-placement--cancelled';
  }
  if (status === 'CONFIRMED') {
    return 'booking-placement--confirmed';
  }
  return 'booking-placement--hold';
}

export function BookingCalendarMatrix({
  days,
  venues,
  grouped,
  onDateClick,
  onPlacementClick,
  onCellQuickAdd,
}: BookingCalendarMatrixProps) {
  return (
    <div className="booking-calendar-matrix" data-testid="booking-calendar-matrix">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {venues.map((venue) => (
              <th key={venue.id}>{venue.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((dateKey) => (
            <tr key={dateKey}>
              <th scope="row">
                <button type="button" onClick={() => onDateClick(dateKey)}>
                  {dateKey}
                </button>
              </th>
              {venues.map((venue) => {
                const placements = grouped[dateKey]?.[venue.id] ?? [];
                const visible = placements.slice(0, MAX_VISIBLE);
                const overflow = placements.length - visible.length;
                return (
                  <td
                    key={`${dateKey}-${venue.id}`}
                    onDoubleClick={() => onCellQuickAdd(dateKey, venue.id)}
                  >
                    {visible.map((placement) => (
                      <button
                        key={placement.eventId}
                        type="button"
                        className={`booking-placement ${statusClass(placement.bookingPlacementStatus)}`}
                        onClick={() => onPlacementClick(placement)}
                      >
                        {placement.title}
                      </button>
                    ))}
                    {overflow > 0 ? (
                      <button
                        type="button"
                        data-testid={`booking-cell-more-${dateKey}`}
                        onClick={() => onDateClick(dateKey)}
                      >
                        +{overflow} more
                      </button>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function placementStatusLabel(status: BookingPlacement['bookingPlacementStatus']): string {
  return formatBookingStatusLabel(status);
}
