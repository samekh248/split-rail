import { EventCard } from '@/components/dashboard/EventCard';
import {
  DashboardZoneEvents,
  type DashboardZoneEventsProps,
} from '@/components/dashboard/DashboardZoneEvents';
import type { EventResponse, PermissionsDto } from '@/types/generated-api';

type ZoneProps = Omit<DashboardZoneEventsProps, 'title' | 'emptyMessage' | 'testId'>;

export function PinnedEventsSection(props: ZoneProps) {
  return (
    <DashboardZoneEvents
      className="dashboard-zone--pinned"
      title="Pinned events"
      emptyMessage="No pinned events"
      testId="dashboard-zone-pinned"
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

export function RecentEventsSection(props: ZoneProps) {
  return (
    <DashboardZoneEvents
      title="Recent events"
      emptyMessage="No recent events"
      testId="dashboard-zone-recent"
      {...props}
    />
  );
}

export interface TonightHeroBannerProps {
  events: EventResponse[];
  permissions: PermissionsDto;
  isEventPinned: (eventId: string) => boolean;
  onQuickLink: DashboardZoneEventsProps['onQuickLink'];
  onPinToggle: (eventId: string) => void;
  onCardActivate: (eventId: string) => void;
}

export function TonightHeroBanner({
  events,
  permissions,
  isEventPinned,
  onQuickLink,
  onPinToggle,
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
    </section>
  );
}
