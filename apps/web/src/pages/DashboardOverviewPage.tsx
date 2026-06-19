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
import {
  useAllVenuesDashboard,
  useDashboard,
  usePinEvent,
  useUnpinEvent,
  normalizeDashboardPartitions,
  type MergedDashboardPartitions,
} from '@/api/dashboard';
import { useUserProfile } from '@/api/user';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { navigateToCreateVenue, navigateToEventWorkspace } from '@/lib/dashboardRoute';
import type { PermissionsDto } from '@/types/generated-api';

const EMPTY_PERMISSIONS: PermissionsDto = {};

const EMPTY_PARTITIONS: MergedDashboardPartitions = {
  pinnedEvents: [],
  tonightEvents: [],
  upcomingEvents: [],
  recentEvents: [],
};

function hasAnyDashboardEvents(partitions: MergedDashboardPartitions): boolean {
  return (
    partitions.pinnedEvents.length > 0
    || partitions.tonightEvents.length > 0
    || partitions.upcomingEvents.length > 0
    || partitions.recentEvents.length > 0
  );
}

export function DashboardOverviewPage() {
  const { isLoading: profileLoading, data: profile } = useUserProfile();
  const canManageVenues = useCanManageVenues();
  const { venues, activeVenueId, isAllVenuesSelected, isLoading, isError, refetch } = useActiveVenue();
  const venueIds = useMemo(() => venues.map((venue) => venue.id).filter(Boolean) as string[], [venues]);
  const singleVenueDashboard = useDashboard(isAllVenuesSelected ? null : activeVenueId);
  const allVenuesDashboard = useAllVenuesDashboard(isAllVenuesSelected ? venueIds : []);
  const dashboardQuery = isAllVenuesSelected ? allVenuesDashboard : singleVenueDashboard;
  const pinEvent = usePinEvent();
  const unpinEvent = useUnpinEvent();
  const [pinError, setPinError] = useState<string | null>(null);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = dashboardQuery;

  const permissions = profile?.role?.permissions ?? EMPTY_PERMISSIONS;
  const hasVenues = venues.length > 0;
  const showEventsContent = hasVenues && (isAllVenuesSelected || Boolean(activeVenueId));

  const partitions = useMemo((): MergedDashboardPartitions => {
    if (!showEventsContent || !dashboardData) {
      return EMPTY_PARTITIONS;
    }
    return normalizeDashboardPartitions(dashboardData);
  }, [dashboardData, showEventsContent]);

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

  const handleQuickLink = (venueId: string, eventId: string, focus?: WorkspaceFocus) => {
    navigateToEventWorkspace(venueId, eventId, focus);
  };

  const handleCardActivate = (venueId: string, eventId: string) => {
    navigateToEventWorkspace(venueId, eventId);
  };

  const handlePinToggle = (venueId: string, eventId: string, currentlyPinned: boolean) => {
    if (!venueId || !eventId) {
      return;
    }
    setPinError(null);
    const mutation = currentlyPinned ? unpinEvent : pinEvent;
    mutation.mutate(
      { venueId, eventId },
      {
        onError: (error) => {
          setPinError(error instanceof Error ? error.message : 'Unable to update pin. Please try again.');
        },
      },
    );
  };

  const zoneProps = {
    permissions,
    onQuickLink: handleQuickLink,
    onPinToggle: handlePinToggle,
    onCardActivate: handleCardActivate,
  };

  return (
    <div className="dashboard-overview">
      {isLoading || (showEventsContent && dashboardLoading) ? (
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

      {!isLoading && !isError && showEventsContent && dashboardError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load events. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry"
            onClick={() => void refetchDashboard()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {pinError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert" data-testid="dashboard-pin-error">
          <p>{pinError}</p>
        </div>
      ) : null}

      {!isLoading &&
      !isError &&
      showEventsContent &&
      !dashboardLoading &&
      !dashboardError &&
      !hasAnyDashboardEvents(partitions) ? (
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
      !dashboardLoading &&
      !dashboardError &&
      hasAnyDashboardEvents(partitions) ? (
        <div className="dashboard-overview__zones" data-testid="dashboard-overview">
          <PinnedEventsSection events={partitions.pinnedEvents} {...zoneProps} />
          <TonightHeroBanner events={partitions.tonightEvents} {...zoneProps} />
          <UpcomingEventsSection events={partitions.upcomingEvents} {...zoneProps} />
          <RecentEventsSection events={partitions.recentEvents} {...zoneProps} />
        </div>
      ) : null}
    </div>
  );
}
