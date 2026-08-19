import type { CSSProperties } from 'react';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  buildMonthCalendarWeeks,
  formatBookingStatusLabel,
  getWeekdayLabels,
  layoutWeekPlacementLanes,
  placementLegendHighlightClass,
  placementStatusClass,
  type BookingPlacement,
  type BookingPlacementStatus,
  type BookingWeekLaneItem,
} from '@/lib/bookingCalendar';
import { formatEventDateRangeLong } from '@/lib/eventDateRange';

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

function spanStyle(item: BookingWeekLaneItem): CSSProperties {
  return {
    gridColumn: `${item.startIndex + 1} / span ${item.span}`,
    gridRow: item.lane + 1,
  };
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
        {weeks.map((week) => {
          const weekDateKeys = week.days.map((day) => day.dateKey);
          const laneItems = layoutWeekPlacementLanes(weekDateKeys, placementsByDate);
          const visibleLaneItems = laneItems.filter(
            (item) => item.lane < MAX_VISIBLE_PLACEMENTS_PER_DAY,
          );
          const laneCount = visibleLaneItems.reduce(
            (max, item) => Math.max(max, item.lane + 1),
            0,
          );

          return (
            <div
              key={week.days[0]?.dateKey ?? 'week'}
              className="booking-calendar-matrix__week"
              style={{ '--week-lane-count': laneCount } as CSSProperties}
            >
              <div className="booking-calendar-matrix__week-days">
                {week.days.map((day) => {
                  const placements = placementsByDate[day.dateKey] ?? [];
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

                      {showTotalBadge ? (
                        <div className="booking-calendar-matrix__day-events">
                          <button
                            type="button"
                            className="booking-calendar-matrix__total-count"
                            data-testid={`booking-cell-total-${day.dateKey}`}
                            onClick={() => onDateClick(day.dateKey)}
                            aria-label={`${totalCount} events on ${day.dateKey}`}
                          >
                            {totalCount}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {visibleLaneItems.length > 0 ? (
                <div className="booking-calendar-matrix__week-lanes">
                  {visibleLaneItems.map((item) => {
                    const startKey = weekDateKeys[item.startIndex] ?? item.placement.eventDate;
                    return (
                      <button
                        key={`${item.placement.eventId}-${startKey}`}
                        type="button"
                        className={[
                          'booking-placement',
                          'booking-calendar-matrix__event',
                          item.span > 1 ? 'booking-calendar-matrix__event--span' : '',
                          item.continuesBefore ? 'booking-calendar-matrix__event--continues-before' : '',
                          item.continuesAfter ? 'booking-calendar-matrix__event--continues-after' : '',
                          item.placement.eventType === 'FESTIVAL'
                            ? 'booking-calendar-matrix__event--festival'
                            : '',
                          placementStatusClass(item.placement.bookingPlacementStatus),
                          placementLegendHighlightClass(
                            item.placement.bookingPlacementStatus,
                            highlightedStatus,
                          ),
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={spanStyle(item)}
                        data-testid={`booking-calendar-span-${item.placement.eventId}-${startKey}`}
                        data-span-days={item.span}
                        onClick={() => onPlacementClick(item.placement)}
                        title={`${item.placement.title} — ${item.placement.venueName} — ${formatEventDateRangeLong(item.placement.eventDate, item.placement.endDate)}`}
                      >
                        <span className="booking-calendar-matrix__event-title">
                          {item.placement.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
