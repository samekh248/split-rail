import type { EventResponse, PermissionsDto } from '@/types/generated-api';
import { EventCard, type WorkspaceFocus } from '@/components/dashboard/EventCard';

export interface DashboardZoneEventsProps {
  title: string;
  emptyMessage: string;
  testId: string;
  className?: string;
  events: EventResponse[];
  venueId: string;
  permissions: PermissionsDto;
  isEventPinned: (eventId: string) => boolean;
  onQuickLink: (venueId: string, eventId: string, focus?: WorkspaceFocus) => void;
  onPinToggle: (eventId: string) => void;
  onCardActivate: (eventId: string) => void;
}

export function DashboardZoneEvents({
  title,
  emptyMessage,
  testId,
  className,
  events,
  venueId,
  permissions,
  isEventPinned,
  onQuickLink,
  onPinToggle,
  onCardActivate,
}: DashboardZoneEventsProps) {
  return (
    <section
      className={['dashboard-zone', className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <h2 className="dashboard-zone__heading">{title}</h2>
      {events.length === 0 ? (
        <p className="dashboard-zone__empty">{emptyMessage}</p>
      ) : (
        <div className="dashboard-zone__cards">
          {events.map((event) => {
            const eventId = event.eventId ?? '';
            return (
              <EventCard
                key={eventId}
                event={event}
                permissions={permissions}
                onQuickLink={onQuickLink}
                isPinned={isEventPinned(eventId)}
                onPinToggle={() => onPinToggle(eventId)}
                onActivate={() => onCardActivate(eventId)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
