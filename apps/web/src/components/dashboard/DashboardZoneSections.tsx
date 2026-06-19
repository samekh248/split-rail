import { useState } from 'react';
import type { ReactNode } from 'react';
import { EventCard } from '@/components/dashboard/EventCard';
import {
  DashboardZoneEvents,
  type DashboardZoneEventsProps,
} from '@/components/dashboard/DashboardZoneEvents';
import { UpcomingEventsMiniCalendar } from '@/components/dashboard/UpcomingEventsMiniCalendar';
import { UpcomingEventsViewToggle } from '@/components/dashboard/UpcomingEventsViewToggle';
import {
  readUpcomingViewMode,
  writeUpcomingViewMode,
  type UpcomingViewMode,
} from '@/lib/upcomingEventsViewStorage';
import type { EventCardDto, PermissionsDto } from '@/types/generated-api';

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
  const [viewMode, setViewMode] = useState<UpcomingViewMode>(() => readUpcomingViewMode());

  const handleViewChange = (mode: UpcomingViewMode) => {
    setViewMode(mode);
    writeUpcomingViewMode(mode);
  };

  const viewToggle = (
    <UpcomingEventsViewToggle mode={viewMode} onChange={handleViewChange} />
  );

  if (viewMode === 'list') {
    return (
      <DashboardZoneEvents
        title="Upcoming events"
        emptyMessage="No upcoming events"
        testId="dashboard-zone-upcoming"
        filterSlot={viewToggle}
        {...props}
      />
    );
  }

  return (
    <section className="dashboard-zone" data-testid="dashboard-zone-upcoming">
      <div className="dashboard-zone__header">
        <h2 className="dashboard-zone__heading">Upcoming events</h2>
        {viewToggle}
      </div>
      {props.events.length === 0 ? (
        <p className="dashboard-zone__empty">No upcoming events</p>
      ) : (
        <UpcomingEventsMiniCalendar
          events={props.events}
          onEventActivate={props.onCardActivate}
        />
      )}
    </section>
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
  onPinToggle: DashboardZoneEventsProps['onPinToggle'];
  onCardActivate: DashboardZoneEventsProps['onCardActivate'];
}

export function TonightHeroBanner({
  events,
  permissions,
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
          const venueId = event.venueId ?? '';
          return (
            <EventCard
              key={eventId}
              event={event}
              permissions={permissions}
              onQuickLink={onQuickLink}
              isPinned={event.isPinned === true}
              onPinToggle={() => onPinToggle(venueId, eventId, event.isPinned === true)}
              onActivate={() => onCardActivate(venueId, eventId)}
            />
          );
        })}
      </div>
    </section>
  );
}
