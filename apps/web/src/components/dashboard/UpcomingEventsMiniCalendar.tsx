import { useMemo, useState } from 'react';
import type { EventCardDto } from '@/types/generated-api';
import {
  buildMiniCalendarWeeks,
  groupEventsByLocalDate,
  truncateEventTitle,
} from '@/lib/upcomingEventsCalendar';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const VISIBLE_EVENTS_PER_DAY = 3;

export interface UpcomingEventsMiniCalendarProps {
  events: EventCardDto[];
  onEventActivate: (venueId: string, eventId: string) => void;
  now?: Date;
}

export function UpcomingEventsMiniCalendar({
  events,
  onEventActivate,
  now = new Date(),
}: UpcomingEventsMiniCalendarProps) {
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);

  const eventsByDate = useMemo(() => groupEventsByLocalDate(events), [events]);
  const weeks = useMemo(() => buildMiniCalendarWeeks(now), [now]);

  const handleEventClick = (venueId: string | undefined, eventId: string | undefined) => {
    if (!venueId || !eventId) {
      return;
    }
    onEventActivate(venueId, eventId);
  };

  return (
    <div className="upcoming-mini-calendar" data-testid="upcoming-mini-calendar" role="grid">
      <div className="upcoming-mini-calendar__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`} className="upcoming-mini-calendar__weekday">
            {label}
          </span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div
          key={`week-${weekIndex}`}
          className="upcoming-mini-calendar__week"
          role="row"
        >
          {week.days.map((day) => {
            const dayEvents = eventsByDate.get(day.dateKey) ?? [];
            const visibleEvents = dayEvents.slice(0, VISIBLE_EVENTS_PER_DAY);
            const hiddenCount = Math.max(0, dayEvents.length - VISIBLE_EVENTS_PER_DAY);
            const isExpanded = expandedDateKey === day.dateKey;
            const hiddenEvents = dayEvents.slice(VISIBLE_EVENTS_PER_DAY);

            const dayClassName = [
              'upcoming-mini-calendar__day',
              !day.inWindow ? 'upcoming-mini-calendar__day--muted' : '',
              day.isAdjacentMonth ? 'upcoming-mini-calendar__day--adjacent' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={day.dateKey}
                className={dayClassName}
                data-testid={`calendar-day-${day.dateKey}`}
                data-in-window={day.inWindow ? 'true' : 'false'}
                data-adjacent-month={day.isAdjacentMonth ? 'true' : 'false'}
                role="gridcell"
              >
                <span className="upcoming-mini-calendar__day-number">{day.date.getDate()}</span>
                {day.inWindow
                  ? visibleEvents.map((event) => {
                      const eventId = event.eventId ?? '';
                      return (
                        <button
                          key={eventId}
                          type="button"
                          className="upcoming-mini-calendar__event"
                          data-testid={`calendar-event-${eventId}`}
                          onClick={() => handleEventClick(event.venueId, event.eventId)}
                        >
                          {truncateEventTitle(event.title)}
                        </button>
                      );
                    })
                  : null}
                {day.inWindow && hiddenCount > 0 ? (
                  <button
                    type="button"
                    className="upcoming-mini-calendar__more"
                    data-testid={`calendar-more-${day.dateKey}`}
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedDateKey(isExpanded ? null : day.dateKey)
                    }
                  >
                    +{hiddenCount} more
                  </button>
                ) : null}
                {day.inWindow && isExpanded && hiddenEvents.length > 0 ? (
                  <div
                    className="upcoming-mini-calendar__popover"
                    data-testid={`calendar-popover-${day.dateKey}`}
                  >
                    {hiddenEvents.map((event) => {
                      const eventId = event.eventId ?? '';
                      return (
                        <button
                          key={eventId}
                          type="button"
                          className="upcoming-mini-calendar__event upcoming-mini-calendar__event--expanded"
                          data-testid={`calendar-event-${eventId}`}
                          onClick={() => handleEventClick(event.venueId, event.eventId)}
                        >
                          {truncateEventTitle(event.title)}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
