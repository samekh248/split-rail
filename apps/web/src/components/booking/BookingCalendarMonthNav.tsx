import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export interface BookingCalendarMonthNavProps {
  month: string;
  onMonthChange: (month: string) => void;
}

function currentMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}`;
}

export function BookingCalendarMonthNav({ month, onMonthChange }: BookingCalendarMonthNavProps) {
  const monthLabel = useMemo(() => currentMonthLabel(month), [month]);

  return (
    <div className="booking-calendar-month-nav" data-testid="booking-calendar-month-nav">
      <button
        type="button"
        data-testid="booking-month-prev"
        aria-label="Previous month"
        onClick={() => onMonthChange(shiftMonth(month, -1))}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
      <span className="booking-calendar-month-nav__label">{monthLabel}</span>
      <button
        type="button"
        data-testid="booking-month-next"
        aria-label="Next month"
        onClick={() => onMonthChange(shiftMonth(month, 1))}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </div>
  );
}
