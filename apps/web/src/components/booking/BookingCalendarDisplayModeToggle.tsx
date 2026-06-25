import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faList } from '@fortawesome/free-solid-svg-icons';
import type { CalendarViewContext } from '@/lib/bookingCalendar';

export interface BookingCalendarDisplayModeToggleProps {
  displayMode: CalendarViewContext['displayMode'];
  onDisplayModeChange: (displayMode: CalendarViewContext['displayMode']) => void;
}

export function BookingCalendarDisplayModeToggle({
  displayMode,
  onDisplayModeChange,
}: BookingCalendarDisplayModeToggleProps) {
  return (
    <div
      className="booking-calendar-display-mode"
      role="group"
      aria-label="Display mode"
      data-testid="booking-calendar-display-mode"
    >
      <button
        type="button"
        data-testid="booking-display-calendar"
        className={
          displayMode === 'calendar'
            ? 'booking-calendar-display-mode__btn booking-calendar-display-mode__btn--active'
            : 'booking-calendar-display-mode__btn'
        }
        aria-pressed={displayMode === 'calendar'}
        onClick={() => onDisplayModeChange('calendar')}
      >
        <FontAwesomeIcon icon={faCalendarDays} /> Calendar
      </button>
      <button
        type="button"
        data-testid="booking-display-list"
        className={
          displayMode === 'list'
            ? 'booking-calendar-display-mode__btn booking-calendar-display-mode__btn--active'
            : 'booking-calendar-display-mode__btn'
        }
        aria-pressed={displayMode === 'list'}
        onClick={() => onDisplayModeChange('list')}
      >
        <FontAwesomeIcon icon={faList} /> List
      </button>
    </div>
  );
}
