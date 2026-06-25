import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  buildMonthCalendarWeeks,
  formatBookingStatusLabel,
  getWeekdayLabels,
  placementLegendHighlightClass,
  placementStatusClass,
  type BookingPlacement,
  type BookingPlacementStatus,
} from '@/lib/bookingCalendar';

export const MAX_VISIBLE_PLACEMENTS_PER_DAY = 2;

export interface BookingCalendarMatrixProps {
  month: string;
  placementsByDate: Record<string, BookingPlacement[]>;
  highlightedStatus?: BookingPlacementStatus | null;
  onDateClick: (dateKey: string) => void;
  onPlacementClick: (placement: BookingPlacement) => void;
  onCellQuickAdd?: (dateKey: string) => void;
}

function formatDayNumber(date: Date): string {
  return String(date.getDate());
}

export function placementStatusLabel(status: BookingPlacement['bookingPlacementStatus']): string {
  return formatBookingStatusLabel(status);
}

export { placementStatusClass as statusClass };

function QuickAddButton({
  dateKey,
  onCellQuickAdd,
}: {
  dateKey: string;
  onCellQuickAdd: (dateKey: string) => void;
}) {
  return (
    <button
      type="button"
      className="booking-calendar-matrix__quick-add"
      data-testid={`booking-cell-quick-add-${dateKey}`}
      onClick={() => onCellQuickAdd(dateKey)}
      aria-label={`Add event on ${dateKey}`}
    >
      <FontAwesomeIcon
        icon={faPlus}
        className="booking-calendar-matrix__quick-add-icon"
        aria-hidden="true"
      />
    </button>
  );
}

export function BookingCalendarMatrix({
  month,
  placementsByDate,
  highlightedStatus = null,
  onDateClick,
  onPlacementClick,
  onCellQuickAdd,
}: BookingCalendarMatrixProps) {
  const weeks = buildMonthCalendarWeeks(month);
  const weekdayLabels = getWeekdayLabels();

  return (
    <div className="booking-calendar-matrix" data-testid="booking-calendar-matrix">
      <div className="booking-calendar-matrix__weekdays" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <div key={label} className="booking-calendar-matrix__weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="booking-calendar-matrix__grid">
        {weeks.map((week) => (
          <div key={week.days[0]?.dateKey ?? 'week'} className="booking-calendar-matrix__week">
            {week.days.map((day) => {
              const placements = placementsByDate[day.dateKey] ?? [];
              const visible = placements.slice(0, MAX_VISIBLE_PLACEMENTS_PER_DAY);
              const totalCount = placements.length;
              const showTotalBadge = totalCount > MAX_VISIBLE_PLACEMENTS_PER_DAY;

              return (
                <div
                  key={day.dateKey}
                  className={`booking-calendar-matrix__day${
                    day.isAdjacentMonth ? ' booking-calendar-matrix__day--adjacent' : ''
                  }`}
                  data-testid={`booking-calendar-day-${day.dateKey}`}
                >
                  <div className="booking-calendar-matrix__day-header">
                    <span className="booking-calendar-matrix__day-label" aria-hidden="true">
                      {formatDayNumber(day.date)}
                    </span>
                    {onCellQuickAdd ? (
                      <QuickAddButton dateKey={day.dateKey} onCellQuickAdd={onCellQuickAdd} />
                    ) : (
                      <span className="booking-calendar-matrix__day-header-spacer" aria-hidden="true" />
                    )}
                  </div>

                  {totalCount > 0 ? (
                    <div className="booking-calendar-matrix__day-events">
                      {visible.map((placement) => (
                        <button
                          key={placement.eventId}
                          type="button"
                          className={[
                            'booking-placement',
                            'booking-calendar-matrix__event',
                            placementStatusClass(placement.bookingPlacementStatus),
                            placementLegendHighlightClass(
                              placement.bookingPlacementStatus,
                              highlightedStatus,
                            ),
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => onPlacementClick(placement)}
                          title={`${placement.title} — ${placement.venueName}`}
                        >
                          <span className="booking-calendar-matrix__event-title">{placement.title}</span>
                        </button>
                      ))}
                      {showTotalBadge ? (
                        <button
                          type="button"
                          className="booking-calendar-matrix__total-count"
                          data-testid={`booking-cell-total-${day.dateKey}`}
                          onClick={() => onDateClick(day.dateKey)}
                          aria-label={`${totalCount} events on ${day.dateKey}`}
                        >
                          {totalCount}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
