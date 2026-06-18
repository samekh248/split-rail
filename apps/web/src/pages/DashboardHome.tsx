import { useEffect, useState } from 'react';
import { EventFormPanel } from '@/components/event/EventFormPanel';
import { useUserProfile } from '@/api/user';
import { useEvents, useCreateEvent } from '@/api/events';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { navigateToCreateVenue, navigateToEventWorkspace } from '@/lib/dashboardRoute';
import { resolveActiveEventId } from '@/venue/eventSelection';
import type { EventResponse } from '@/types/generated-api';

export function DashboardHome() {
  const { isLoading: profileLoading } = useUserProfile();
  const canManageVenues = useCanManageVenues();
  const canManageEvents = useCanManageEvents();
  const { venues, activeVenueId, isLoading, isError, refetch } = useActiveVenue();
  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(activeVenueId);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const createEvent = useCreateEvent(activeVenueId);

  useEffect(() => {
    if (isLoading || isError || !activeVenueId || eventsLoading || eventsError || showCreatePanel) {
      return;
    }
    if (events.length === 0) {
      return;
    }

    const eventId = resolveActiveEventId(events, activeVenueId);
    if (eventId) {
      navigateToEventWorkspace(activeVenueId, eventId);
    }
  }, [isLoading, isError, activeVenueId, events, eventsLoading, eventsError, showCreatePanel]);

  const handleCreateSuccess = (created: EventResponse) => {
    setShowCreatePanel(false);
    if (created.eventId && activeVenueId) {
      navigateToEventWorkspace(activeVenueId, created.eventId);
    }
  };

  return (
    <div className="dashboard-home">
      {isLoading || (activeVenueId && eventsLoading) ? (
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

      {!isLoading && !isError && activeVenueId && eventsError ? (
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
      activeVenueId &&
      !eventsLoading &&
      !eventsError &&
      events.length === 0 ? (
        <section className="dashboard-empty" aria-labelledby="events-empty-heading">
          <h2 id="events-empty-heading" className="dashboard-empty__heading">
            No events yet
          </h2>
          <p className="dashboard-empty__text">
            {canManageEvents
              ? 'Create your first event to open the financial ledger for this venue.'
              : 'This venue does not have any events yet. Ask someone with financial access to add one.'}
          </p>
          {canManageEvents ? (
            <button
              type="button"
              className="dashboard-empty__cta"
              data-testid="empty-state-create-event"
              onClick={() => setShowCreatePanel(true)}
            >
              Create event
            </button>
          ) : null}
        </section>
      ) : null}

      {showCreatePanel && canManageEvents ? (
        <EventFormPanel
          mode="create"
          isPending={createEvent.isPending}
          onCancel={() => setShowCreatePanel(false)}
          onSubmit={async (values) => {
            const created = await createEvent.mutateAsync({
              title: values.title,
              eventDate: values.eventDate,
              qboTagName: values.qboTagName || null,
            });
            handleCreateSuccess(created);
          }}
        />
      ) : null}
    </div>
  );
}
