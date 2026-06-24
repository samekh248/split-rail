import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEvents } from '@/api/events';
import { EventCombobox } from '@/components/event/EventCombobox';
import { useShellWorkspaceBar } from '@/components/shell/ShellWorkspaceBarContext';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { setActiveEventId } from '@/venue/activeEventStorage';
import { resolveActiveEventId } from '@/venue/eventSelection';
import { useActiveVenue } from '@/venue/useActiveVenue';

export interface DashboardHomeProps {
  organizationName: string;
}

export function DashboardHome(_props: DashboardHomeProps) {
  const {
    activeVenueId,
    venues,
    isLoading: venuesLoading,
    isError: venuesError,
    refetch,
  } = useActiveVenue();
  const canManageEvents = useCanManageEvents();
  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useEvents(activeVenueId);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVenueId || eventsLoading) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId(resolveActiveEventId(events, activeVenueId));
  }, [activeVenueId, events, eventsLoading]);

  const handleEventSelect = useCallback(
    (eventId: string) => {
      if (activeVenueId) {
        setActiveEventId(activeVenueId, eventId);
      }
      setSelectedEventId(eventId);
    },
    [activeVenueId],
  );

  const workspaceBarContent = useMemo(
    () => (
      <div className="dashboard-workspace-bar" data-testid="dashboard-workspace-bar">
        <VenueSwitcher />
        {activeVenueId && !eventsLoading && events.length > 0 ? (
          <EventCombobox
            events={events}
            selectedEventId={selectedEventId}
            canManageEvents={canManageEvents}
            onSelect={handleEventSelect}
          />
        ) : null}
      </div>
    ),
    [
      activeVenueId,
      events,
      eventsLoading,
      selectedEventId,
      canManageEvents,
      handleEventSelect,
    ],
  );

  useShellWorkspaceBar(workspaceBarContent);

  const isLoading = venuesLoading || (activeVenueId !== null && eventsLoading);
  const loadError = venuesError ?? eventsError;

  return (
    <>
      {isLoading ? (
        <div className="dashboard-empty" role="status" aria-live="polite">
          Loading workspace…
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load workspace. Please try again.</p>
          <button
            type="button"
            className="dashboard-empty__retry btn-primary"
            onClick={() => {
              void refetch();
              if (activeVenueId) void refetchEvents();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && venues.length === 0 ? (
        <section className="dashboard-empty" aria-labelledby="dashboard-empty-heading">
          <h2 id="dashboard-empty-heading" className="dashboard-empty__heading">
            No venues yet
          </h2>
          <p className="dashboard-empty__text">
            Your organization is set up. Add a venue to start managing events and ledgers.
          </p>
        </section>
      ) : null}

      {!isLoading && !loadError && venues.length > 0 && !activeVenueId ? (
        <section className="dashboard-empty" aria-labelledby="dashboard-select-venue-heading">
          <h2 id="dashboard-select-venue-heading" className="dashboard-empty__heading">
            Select a venue
          </h2>
          <p className="dashboard-empty__text">
            Choose a venue from the menu above to view events and ledgers.
          </p>
        </section>
      ) : null}

      {!isLoading &&
      !loadError &&
      activeVenueId &&
      !eventsLoading &&
      events.length === 0 ? (
        <section className="dashboard-empty" aria-labelledby="dashboard-no-events-heading">
          <h2 id="dashboard-no-events-heading" className="dashboard-empty__heading">
            No events yet
          </h2>
          <p className="dashboard-empty__text">
            Create an event for this venue to open the financial ledger.
          </p>
        </section>
      ) : null}

      {!isLoading && !loadError && activeVenueId && selectedEventId ? (
        <EventLedgerPage venueId={activeVenueId} eventId={selectedEventId} />
      ) : null}
    </>
  );
}
