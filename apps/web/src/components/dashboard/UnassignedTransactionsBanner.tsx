import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';
import { UnassignedTransactionsDrawer } from '@/components/dashboard/UnassignedTransactionsDrawer';
import type { ActionCenterDto, VenueResponse } from '@/types/generated-api';

export interface UnassignedTransactionsBannerProps {
  actionCenter?: ActionCenterDto;
  venues: VenueResponse[];
  isAllVenuesView: boolean;
  isLoading: boolean;
  venueScopeKey: string;
  onRetryDashboard?: () => void;
}

function formatBannerMessage(count: number): string {
  return `${count} unassigned transaction${count === 1 ? '' : 's'} detected`;
}

export function UnassignedTransactionsBanner({
  actionCenter,
  venues,
  isAllVenuesView,
  isLoading,
  venueScopeKey,
  onRetryDashboard,
}: UnassignedTransactionsBannerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const totalUnmappedCount = actionCenter?.totalUnmappedCount ?? 0;

  useEffect(() => {
    setDrawerOpen(false);
  }, [venueScopeKey]);

  if (isLoading) {
    return (
      <LoadingPlaceholder
        variant="banner"
        label="Loading unassigned transactions"
        data-testid="unassigned-transactions-loading"
      />
    );
  }

  const showBanner = totalUnmappedCount > 0;

  return (
    <>
      {showBanner ? (
        <section
          className="unassigned-transactions-banner"
          data-testid="unassigned-transactions-banner"
          role="alert"
        >
          <button
            type="button"
            className="unassigned-transactions-banner__toggle"
            data-testid="unassigned-transactions-banner-toggle"
            onClick={() => setDrawerOpen(true)}
          >
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="unassigned-transactions-banner__icon"
              aria-hidden
            />
            {formatBannerMessage(totalUnmappedCount)}
          </button>
        </section>
      ) : null}

      <UnassignedTransactionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eventsWithUnmapped={actionCenter?.eventsWithUnmapped ?? []}
        totalUnmappedCount={totalUnmappedCount}
        venues={venues}
        isAllVenuesView={isAllVenuesView}
        onRetry={onRetryDashboard}
      />
    </>
  );
}
