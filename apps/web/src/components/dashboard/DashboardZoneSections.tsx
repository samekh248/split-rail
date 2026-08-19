import type { ReactNode } from 'react';
import { EventCard } from '@/components/dashboard/EventCard';
import { PinnedPerformanceCard } from '@/components/dashboard/PinnedPerformanceCard';
import {
  DashboardZoneEvents,
  type DashboardZoneEventsProps,
} from '@/components/dashboard/DashboardZoneEvents';
import type { EventCardDto, PermissionsDto, PinnedPerformanceDto } from '@/types/generated-api';

type ZoneProps = Omit<DashboardZoneEventsProps, 'title' | 'emptyMessage' | 'testId'>;

export function PinnedEventsSection(
  props: ZoneProps & {
    performances?: PinnedPerformanceDto[];
    onPerformancePinToggle?: (
      venueId: string,
      eventId: string,
      blockId: string,
      isPinned: boolean,
    ) => void;
    onPerformanceActivate?: (venueId: string, eventId: string) => void;
  },
) {
  const {
    performances = [],
    onPerformancePinToggle,
    onPerformanceActivate,
    events,
    ...zoneProps
  } = props;
  const hasEvents = events.length > 0;
  const hasPerformances = performances.length > 0;

  return (
    <section
      className="dashboard-zone dashboard-zone--pinned"
      data-testid="dashboard-zone-pinned"
    >
      <div className="dashboard-zone__header">
        <h2 className="dashboard-zone__heading">Pinned events</h2>
      </div>
      {!hasEvents && !hasPerformances ? (
        <p className="dashboard-zone__empty">No pinned events</p>
      ) : (
        <div className="dashboard-zone__cards">
          {events.map((event) => {
            const eventId = event.eventId ?? '';
            const venueId = event.venueId ?? '';
            return (
              <EventCard
                key={eventId}
                event={event}
                permissions={zoneProps.permissions}
                onQuickLink={zoneProps.onQuickLink}
                isPinned={event.isPinned === true}
                onPinToggle={() => zoneProps.onPinToggle(venueId, eventId, event.isPinned === true)}
                onActivate={() => zoneProps.onCardActivate(venueId, eventId)}
                compact={false}
                showProgressBar={zoneProps.showProgressBar ?? true}
              />
            );
          })}
          {performances.map((performance) => (
            <PinnedPerformanceCard
              key={performance.blockId}
              performance={performance}
              onPinToggle={onPerformancePinToggle ?? (() => undefined)}
              onActivate={onPerformanceActivate ?? zoneProps.onCardActivate}
            />
          ))}
        </div>
      )}
    </section>
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
              showProgressBar
            />
          );
        })}
      </div>
    </section>
  );
}
