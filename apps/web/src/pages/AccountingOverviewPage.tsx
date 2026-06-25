import { useMemo } from 'react';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { UnassignedTransactionsBanner } from '@/components/dashboard/UnassignedTransactionsBanner';
import { VenueQboStatusCard } from '@/components/accounting/VenueQboStatusCard';
import { AccountingWorkloadList } from '@/components/accounting/AccountingWorkloadList';
import { SyncAllButton } from '@/components/qbo/SyncAllButton';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';
import { useShellWorkspaceBar } from '@/components/shell/ShellWorkspaceBarContext';
import { useDashboard } from '@/api/dashboard';
import { useVenueQboStatus } from '@/api/qbo';
import { useUserProfile } from '@/api/user';
import { deriveAccountingWorkloadEvents } from '@/lib/accountingWorkload';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { navigateToVenues } from '@/lib/dashboardRoute';

export function AccountingOverviewPage() {
  const { isLoading: profileLoading } = useUserProfile();
  const canViewFinancials = useCanManageEvents();
  const canManageVenues = useCanManageVenues();
  const { venues, activeVenueId, isAllVenuesSelected, isLoading, isError, refetch } = useActiveVenue();
  const venueId = isAllVenuesSelected ? null : activeVenueId;
  const dashboardQuery = useDashboard(venueId);
  const qboStatusQuery = useVenueQboStatus(venueId ?? '');

  const hasVenues = venues.length > 0;
  const showContent = hasVenues && Boolean(venueId);

  const workloadEvents = useMemo(
    () => deriveAccountingWorkloadEvents(dashboardQuery.data),
    [dashboardQuery.data],
  );

  const venueScopeKey = venueId ?? 'none';

  const workspaceBarContent = useMemo(
    () => (
      <div className="accounting-workspace-bar" data-testid="accounting-workspace-bar">
        <VenueSwitcher />
      </div>
    ),
    [],
  );

  useShellWorkspaceBar(workspaceBarContent);

  if (!profileLoading && !canViewFinancials) {
    return (
      <div
        className="dashboard-empty dashboard-empty--error"
        role="alert"
        data-testid="accounting-access-denied"
      >
        <p>You do not have access to financial data for this organization.</p>
      </div>
    );
  }

  return (
    <div className="accounting-overview" data-testid="accounting-overview-page">
      <header className="accounting-overview__header">
        <h1 className="accounting-overview__title">Settlements &amp; Accounting Sync</h1>
      </header>

      {isLoading ? (
        <LoadingPlaceholder
          variant="page"
          label="Loading workspace…"
          data-testid="accounting-page-loading"
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
        <section className="dashboard-empty" aria-labelledby="accounting-empty-heading">
          <h2 id="accounting-empty-heading" className="dashboard-empty__heading">
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

      {!isLoading && !isError && showContent && dashboardQuery.isError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load accounting data. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry btn-primary"
            onClick={() => void dashboardQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && showContent && !dashboardQuery.isError ? (
        <>
          <VenueQboStatusCard status={qboStatusQuery.data} isLoading={qboStatusQuery.isLoading} />
          {venueId ? <SyncAllButton venueId={venueId} /> : null}
          <UnassignedTransactionsBanner
            actionCenter={dashboardQuery.data?.actionCenter}
            venues={venues}
            isAllVenuesView={false}
            isLoading={dashboardQuery.isLoading}
            venueScopeKey={venueScopeKey}
            onRetryDashboard={() => void dashboardQuery.refetch()}
          />
          {dashboardQuery.isLoading ? (
            <LoadingPlaceholder
              variant="card"
              label="Loading accounting workload"
              data-testid="accounting-workload-loading"
            />
          ) : (
            <AccountingWorkloadList events={workloadEvents} />
          )}
        </>
      ) : null}
    </div>
  );
}
