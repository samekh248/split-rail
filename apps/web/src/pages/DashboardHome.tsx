import { useEffect, useRef, useState } from 'react';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { useAuth } from '@/auth/useAuth';
import { useUserProfile } from '@/api/user';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { navigateToCreateVenue } from '@/lib/dashboardRoute';
import { DEFAULT_EVENT_ID } from '@/venue/defaults';

export interface DashboardHomeProps {
  organizationName: string;
}

export function DashboardHome({ organizationName }: DashboardHomeProps) {
  const { logout } = useAuth();
  const { isLoading: profileLoading } = useUserProfile();
  const canManageVenues = useCanManageVenues();
  const { venues, activeVenueId, isLoading, isError, refetch } = useActiveVenue();
  const [eventId, setEventId] = useState(DEFAULT_EVENT_ID);
  const previousVenueIdRef = useRef<string | null>(activeVenueId);

  useEffect(() => {
    if (
      previousVenueIdRef.current !== null &&
      activeVenueId !== null &&
      previousVenueIdRef.current !== activeVenueId
    ) {
      setEventId(DEFAULT_EVENT_ID);
    }
    previousVenueIdRef.current = activeVenueId;
  }, [activeVenueId]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div>
            <h1>Split Rail</h1>
            <p className="app__subtitle">{organizationName}</p>
          </div>
          <div className="app__header-actions">
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
            <button type="button" className="app__logout" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
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

      {!isLoading && !isError && activeVenueId ? (
        <EventLedgerPage venueId={activeVenueId} eventId={eventId} />
      ) : null}
    </div>
  );
}
