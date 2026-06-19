import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faList } from '@fortawesome/free-solid-svg-icons';
import type { UpcomingViewMode } from '@/lib/upcomingEventsViewStorage';

export interface UpcomingEventsViewToggleProps {
  mode: UpcomingViewMode;
  onChange: (mode: UpcomingViewMode) => void;
}

export function UpcomingEventsViewToggle({ mode, onChange }: UpcomingEventsViewToggleProps) {
  return (
    <div className="upcoming-view-toggle" role="group" aria-label="Upcoming events view">
      <button
        type="button"
        className={[
          'upcoming-view-toggle__button',
          mode === 'list' ? 'upcoming-view-toggle__button--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="upcoming-view-list"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
      >
        <FontAwesomeIcon icon={faList} className="upcoming-view-toggle__icon" aria-hidden />
        List
      </button>
      <button
        type="button"
        className={[
          'upcoming-view-toggle__button',
          mode === 'calendar' ? 'upcoming-view-toggle__button--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="upcoming-view-calendar"
        aria-pressed={mode === 'calendar'}
        onClick={() => onChange('calendar')}
      >
        <FontAwesomeIcon icon={faCalendarDays} className="upcoming-view-toggle__icon" aria-hidden />
        Calendar
      </button>
    </div>
  );
}
