import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { useVenues } from '@/api/venues';
import { useAuth } from '@/auth/useAuth';

export interface DashboardHomeProps {
  organizationName: string;
}

function parseRouteParams(): { venueId: string; eventId: string } {
  const params = new URLSearchParams(window.location.search);
  const venueId = params.get('venueId') ?? '00000000-0000-0000-0000-000000000001';
  const eventId = params.get('eventId') ?? '00000000-0000-0000-0000-000000000002';
  return { venueId, eventId };
}

export function DashboardHome({ organizationName }: DashboardHomeProps) {
  const { logout } = useAuth();
  const { data: venues, isLoading, error, refetch } = useVenues();
  const routeParams = parseRouteParams();

  const venueId =
    routeParams.venueId !== '00000000-0000-0000-0000-000000000001'
      ? routeParams.venueId
      : (venues?.[0]?.id ?? routeParams.venueId);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div>
            <h1>Split Rail</h1>
            <p className="app__subtitle">{organizationName}</p>
          </div>
          <button type="button" className="app__logout" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="dashboard-empty" role="status" aria-live="polite">
          Loading workspace…
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load venues. Please try again.</p>
          <button type="button" className="dashboard-empty__retry" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !error && venues && venues.length === 0 ? (
        <section className="dashboard-empty" aria-labelledby="dashboard-empty-heading">
          <h2 id="dashboard-empty-heading" className="dashboard-empty__heading">
            No venues yet
          </h2>
          <p className="dashboard-empty__text">
            Your organization is set up. Add a venue to start managing events and ledgers.
          </p>
        </section>
      ) : null}

      {!isLoading && !error && venues && venues.length > 0 ? (
        <EventLedgerPage venueId={venueId} eventId={routeParams.eventId} />
      ) : null}
    </div>
  );
}
