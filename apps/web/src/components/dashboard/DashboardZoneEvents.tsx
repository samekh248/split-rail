import type { ReactNode } from 'react';
import type { EventCardDto, PermissionsDto } from '@/types/generated-api';
import { EventCard, type WorkspaceFocus } from '@/components/dashboard/EventCard';

export interface DashboardZoneEventsProps {
  title: string;
  emptyMessage: string;
  testId: string;
  className?: string;
  filterSlot?: ReactNode;
  compact?: boolean;
  events: EventCardDto[];
  permissions: PermissionsDto;
  onQuickLink: (venueId: string, eventId: string, focus?: WorkspaceFocus) => void;
  onPinToggle: (venueId: string, eventId: string, isPinned: boolean) => void;
  onCardActivate: (venueId: string, eventId: string) => void;
}

export function DashboardZoneEvents({
  title,
  emptyMessage,
  testId,
  className,
  filterSlot,
  compact = true,
  events,
  permissions,
  onQuickLink,
  onPinToggle,
  onCardActivate,
}: DashboardZoneEventsProps) {
  return (
    <section
      className={['dashboard-zone', className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <div className="dashboard-zone__header">
        <h2 className="dashboard-zone__heading">{title}</h2>
        {filterSlot}
      </div>
      {events.length === 0 ? (
        <p className="dashboard-zone__empty">{emptyMessage}</p>
      ) : (
        <div className="dashboard-zone__cards">
          {events.map((event) => {
            const eventId = event.eventId ?? '';
            const venueId = event.venueId ?? '';
            return (
              <EventCard
                key={eventId}
                event={event}
                permissions={permissions}
                onQuickLink={onQuickLink}
                isPinned={event.isPinned === true}
                onPinToggle={
                  compact
                    ? undefined
                    : () => onPinToggle(venueId, eventId, event.isPinned === true)
                }
                onActivate={() => onCardActivate(venueId, eventId)}
                compact={compact}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
