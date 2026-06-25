import { useEffect, useMemo, useState } from 'react';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import {
  PinnedEventsSection,
  RecentEventsSection,
  TonightHeroBanner,
  UpcomingEventsSection,
} from '@/components/dashboard/DashboardZoneSections';
import { BottleneckFilter } from '@/components/dashboard/BottleneckFilter';
import { FinancialHealthWidget } from '@/components/dashboard/FinancialHealthWidget';
import { UnassignedTransactionsBanner } from '@/components/dashboard/UnassignedTransactionsBanner';
import {
  DashboardZoneLoading,
  LoadingPlaceholder,
} from '@/components/shell/LoadingPlaceholder';
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
import {
  eventHasBottleneckAlerts,
  filterRecentEventsByBottleneck,
} from '@/lib/eventCardSummary';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { navigateToVenues, navigateToEventWorkspace } from '@/lib/dashboardRoute';
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
  const [bottleneckFilterActive, setBottleneckFilterActive] = useState(false);

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

  const actionCenter = isAllVenuesSelected
    ? allVenuesDashboard.actionCenter
    : singleVenueDashboard.data?.actionCenter;

  const financialHealth = isAllVenuesSelected
    ? undefined
    : singleVenueDashboard.data?.financialHealth;

  const venueScopeKey = isAllVenuesSelected ? 'all' : (activeVenueId ?? 'none');

  useEffect(() => {
    setBottleneckFilterActive(false);
  }, [venueScopeKey]);

  const recentAlertCount = useMemo(
    () => partitions.recentEvents.filter(eventHasBottleneckAlerts).length,
    [partitions.recentEvents],
  );

  const displayedRecentEvents = useMemo(
    () => filterRecentEventsByBottleneck(partitions.recentEvents, bottleneckFilterActive),
    [partitions.recentEvents, bottleneckFilterActive],
  );

  const recentEmptyMessage = bottleneckFilterActive
    && partitions.recentEvents.length > 0
    && displayedRecentEvents.length === 0
    ? 'No events need attention'
    : 'No recent events';

  const showDashboardWidgets = showEventsContent && !dashboardLoading && !dashboardError;
  const showDashboardBody = !isLoading && !isError && showEventsContent && !dashboardError;
  const dashboardDataLoading = showEventsContent && dashboardLoading;

  const dashboardLoadingContent = (
    <>
      <div className="dashboard-overview__insights">
        <LoadingPlaceholder
          variant="banner"
          label="Loading unassigned transactions"
          data-testid="unassigned-transactions-loading"
        />
        {!isAllVenuesSelected ? (
          <LoadingPlaceholder
            variant="zone"
            label="Loading financial health"
            data-testid="financial-health-loading"
          />
        ) : null}
      </div>
      <div className="dashboard-overview__zones" data-testid="dashboard-overview-loading">
        <DashboardZoneLoading title="Pinned events" data-testid="dashboard-zone-pinned-loading" />
        <DashboardZoneLoading title="Upcoming events" data-testid="dashboard-zone-upcoming-loading" />
        <DashboardZoneLoading title="Recent events" data-testid="dashboard-zone-recent-loading" />
      </div>
    </>
  );

  const workspaceBarContent = useMemo(
    () => (
      <div className="dashboard-workspace-bar" data-testid="dashboard-workspace-bar">
        <VenueSwitcher />
      </div>
    ),
    [],
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

  const dashboardActionWidgets = showDashboardWidgets ? (
    <div className="dashboard-overview__insights">
      <UnassignedTransactionsBanner
        actionCenter={actionCenter}
        venues={venues}
        isAllVenuesView={isAllVenuesSelected}
        isLoading={dashboardLoading}
        venueScopeKey={venueScopeKey}
        onRetryDashboard={() => void refetchDashboard()}
      />
      {!isAllVenuesSelected ? (
        <FinancialHealthWidget financialHealth={financialHealth} isLoading={dashboardLoading} />
      ) : null}
    </div>
  ) : null;

  const recentFilterSlot = showDashboardWidgets ? (
    <BottleneckFilter
      active={bottleneckFilterActive}
      onToggle={() => setBottleneckFilterActive((active) => !active)}
      alertedCount={recentAlertCount}
    />
  ) : null;

  return (
    <main className="dashboard-overview">
      {isLoading ? (
        <LoadingPlaceholder
          variant="page"
          label="Loading workspace…"
          data-testid="dashboard-page-loading"
        />
      ) : null}

      {!isLoading && isError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load venues. Please try again.</p>
          <button type="button" className="dashboard-empty__retry btn-primary" onClick={() => void refetch()}>
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
              onClick={() => navigateToVenues()}
            >
              Go to Venues
            </button>
          ) : null}
        </section>
      ) : null}

      {!isLoading && !isError && showEventsContent && dashboardError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load events. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry btn-primary"
            onClick={() => void refetchDashboard()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {pinError ? (
        <p className="dashboard-overview__error" role="alert" data-testid="dashboard-pin-error">
          {pinError}
        </p>
      ) : null}

      {showDashboardBody && dashboardDataLoading ? dashboardLoadingContent : null}

      {showDashboardBody &&
      !dashboardDataLoading &&
      !hasAnyDashboardEvents(partitions) ? (
        <>
          {dashboardActionWidgets}
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
        </>
      ) : null}

      {showDashboardBody &&
      !dashboardDataLoading &&
      hasAnyDashboardEvents(partitions) ? (
        <>
          {dashboardActionWidgets}
          <div className="dashboard-overview__zones" data-testid="dashboard-overview">
            <PinnedEventsSection events={partitions.pinnedEvents} {...zoneProps} />
            <TonightHeroBanner events={partitions.tonightEvents} {...zoneProps} />
            <UpcomingEventsSection events={partitions.upcomingEvents} {...zoneProps} />
            <RecentEventsSection
              events={displayedRecentEvents}
              emptyMessage={recentEmptyMessage}
              filterSlot={recentFilterSlot}
              {...zoneProps}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}
