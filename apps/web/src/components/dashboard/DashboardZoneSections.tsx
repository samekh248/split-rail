import type { ReactNode } from 'react';
import { EventCard } from '@/components/dashboard/EventCard';
import {
  DashboardZoneEvents,
  type DashboardZoneEventsProps,
} from '@/components/dashboard/DashboardZoneEvents';
import type { EventCardDto, PermissionsDto } from '@/types/generated-api';

type ZoneProps = Omit<DashboardZoneEventsProps, 'title' | 'emptyMessage' | 'testId'>;

export function PinnedEventsSection(props: ZoneProps) {
  return (
    <DashboardZoneEvents
      className="dashboard-zone--pinned"
      title="Pinned events"
      emptyMessage="No pinned events"
      testId="dashboard-zone-pinned"
      compact={false}
      {...props}
    />
  );
}

export function UpcomingEventsSection(props: ZoneProps) {
  return (
    <DashboardZoneEvents
      title="Upcoming events"
      emptyMessage="No upcoming events"
      testId="dashboard-zone-upcoming"
      {...props}
    />
  );
}

export function RecentEventsSection(
  props: ZoneProps & { filterSlot?: ReactNode; emptyMessage?: string },
) {
  const { filterSlot, emptyMessage, ...zoneProps } = props;
  return (
    <DashboardZoneEvents
      title="Recent events"
      emptyMessage={emptyMessage ?? 'No recent events'}
      testId="dashboard-zone-recent"
      filterSlot={filterSlot}
      {...zoneProps}
    />
  );
}

export interface TonightHeroBannerProps {
  events: EventCardDto[];
  permissions: PermissionsDto;
  onQuickLink: DashboardZoneEventsProps['onQuickLink'];
  onCardActivate: DashboardZoneEventsProps['onCardActivate'];
}

export function TonightHeroBanner({
  events,
  permissions,
  onQuickLink,
  onCardActivate,
}: TonightHeroBannerProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="dashboard-zone dashboard-zone--tonight" data-testid="dashboard-zone-tonight">
      <h2 className="dashboard-zone__heading">Tonight</h2>
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
              onActivate={() => onCardActivate(venueId, eventId)}
              compact
            />
          );
        })}
      </div>
    </section>
  );
}
