import { useMemo, useState } from 'react';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import {
  PinnedEventsSection,
  RecentEventsSection,
  TonightHeroBanner,
  UpcomingEventsSection,
} from '@/components/dashboard/DashboardZoneSections';
import type { WorkspaceFocus } from '@/components/dashboard/EventCard';
import { useShellWorkspaceBar } from '@/components/shell/ShellWorkspaceBarContext';
import { useUserProfile } from '@/api/user';
import { useAllVenuesEvents, useEvents } from '@/api/events';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { navigateToCreateVenue, navigateToEventWorkspace } from '@/lib/dashboardRoute';
import { partitionOverviewZones } from '@/lib/partitionOverviewZones';
import { isEventPinned, toggleEventPinned } from '@/lib/pinnedEventStorage';
import type { PermissionsDto } from '@/types/generated-api';

const EMPTY_PERMISSIONS: PermissionsDto = {};

export function DashboardOverviewPage() {
  const { isLoading: profileLoading, data: profile } = useUserProfile();
  const canManageVenues = useCanManageVenues();
  const { venues, activeVenueId, isAllVenuesSelected, isLoading, isError, refetch } = useActiveVenue();
  const venueIds = useMemo(() => venues.map((venue) => venue.id).filter(Boolean) as string[], [venues]);
  const singleVenueEvents = useEvents(activeVenueId);
  const allVenuesEvents = useAllVenuesEvents(isAllVenuesSelected ? venueIds : []);
  const eventsQuery = isAllVenuesSelected ? allVenuesEvents : singleVenueEvents;
  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = eventsQuery;
  const [pinnedRevision, setPinnedRevision] = useState(0);

  const permissions = profile?.role?.permissions ?? EMPTY_PERMISSIONS;
  const hasVenues = venues.length > 0;
  const showEventsContent = hasVenues && (isAllVenuesSelected || Boolean(activeVenueId));

  const partition = useMemo(() => {
    if (!showEventsContent) {
      return { tonight: [], pinned: [], upcoming: [], recent: [] };
    }
    void pinnedRevision;
    return partitionOverviewZones(events);
  }, [events, showEventsContent, pinnedRevision]);

  const workspaceBarContent = useMemo(
    () => (
      <div className="dashboard-workspace-bar" data-testid="dashboard-workspace-bar">
        {!profileLoading && canManageVenues ? (
          <button
            type="button"
            className="app__add-venue"
            data-testid="header-add-venue"
            onClick={() => navigateToCreateVenue()}
          >
            Add venue
          </button>
        ) : null}
        <VenueSwitcher />
      </div>
    ),
    [profileLoading, canManageVenues],
  );

  useShellWorkspaceBar(workspaceBarContent);

  const findEvent = (eventId: string) => events.find((event) => event.eventId === eventId);

  const handleQuickLink = (venueId: string, eventId: string, focus?: WorkspaceFocus) => {
    navigateToEventWorkspace(venueId, eventId, focus);
  };

  const handleCardActivate = (eventId: string) => {
    const event = findEvent(eventId);
    const venueId = event?.venueId ?? activeVenueId;
    if (venueId) {
      navigateToEventWorkspace(venueId, eventId);
    }
  };

  const handlePinToggle = (eventId: string) => {
    const event = findEvent(eventId);
    const venueId = event?.venueId ?? activeVenueId;
    if (!venueId) {
      return;
    }
    toggleEventPinned(venueId, eventId);
    setPinnedRevision((value) => value + 1);
  };

  const checkPinned = (eventId: string) => {
    const event = findEvent(eventId);
    const venueId = event?.venueId ?? activeVenueId;
    return venueId ? isEventPinned(venueId, eventId) : false;
  };

  const zoneProps = {
    venueId: activeVenueId ?? '',
    permissions,
    isEventPinned: checkPinned,
    onQuickLink: handleQuickLink,
    onPinToggle: handlePinToggle,
    onCardActivate: handleCardActivate,
  };

  return (
    <div className="dashboard-overview">
      {isLoading || (showEventsContent && eventsLoading) ? (
        <div className="dashboard-empty" role="status" aria-live="polite">
          Loading workspace…
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load venues. Please try again.</p>
          <button type="button" className="dashboard-empty__retry" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && venues.length === 0 ? (
        <section className="dashboard-empty" aria-labelledby="dashboard-empty-heading">
          <h2 id="dashboard-empty-heading" className="dashboard-empty__heading">
            No venues yet
          </h2>
          <p className="dashboard-empty__text">
            {!profileLoading && canManageVenues
              ? 'Your organization is set up. Add a venue to start managing events and ledgers.'
              : !profileLoading
                ? 'Your organization does not have any venues yet. Ask someone with venue management access to add one before you can begin.'
                : 'Your organization is set up. Add a venue to start managing events and ledgers.'}
          </p>
          {!profileLoading && canManageVenues ? (
            <button
              type="button"
              className="dashboard-empty__cta"
              data-testid="empty-state-add-venue"
              onClick={() => navigateToCreateVenue()}
            >
              Add venue
            </button>
          ) : null}
        </section>
      ) : null}

      {!isLoading && !isError && showEventsContent && eventsError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load events. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry"
            onClick={() => void refetchEvents()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading &&
      !isError &&
      showEventsContent &&
      !eventsLoading &&
      !eventsError &&
      events.length === 0 ? (
        <section className="dashboard-empty" data-testid="dashboard-no-events" aria-labelledby="events-empty-heading">
          <h2 id="events-empty-heading" className="dashboard-empty__heading">
            No events yet
          </h2>
          <p className="dashboard-empty__text">
            {isAllVenuesSelected
              ? 'There are no events across your venues yet. Create events from the event management workspace.'
              : 'This venue does not have any events yet. Create events from the event management workspace.'}
          </p>
        </section>
      ) : null}

      {!isLoading &&
      !isError &&
      showEventsContent &&
      !eventsLoading &&
      !eventsError &&
      events.length > 0 ? (
        <div className="dashboard-overview__zones" data-testid="dashboard-overview">
          <PinnedEventsSection events={partition.pinned} {...zoneProps} />
          <TonightHeroBanner events={partition.tonight} {...zoneProps} />
          <UpcomingEventsSection events={partition.upcoming} {...zoneProps} />
          <RecentEventsSection events={partition.recent} {...zoneProps} />
        </div>
      ) : null}
    </div>
  );
}
