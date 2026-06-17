import { useEffect, useRef, useState } from 'react';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { EventCombobox } from '@/components/event/EventCombobox';
import { EventFormPanel } from '@/components/event/EventFormPanel';
import { EventDeleteConfirm } from '@/components/event/EventDeleteConfirm';
import { useAuth } from '@/auth/useAuth';
import { useUserProfile } from '@/api/user';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/api/events';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { navigateToCreateVenue } from '@/lib/dashboardRoute';
import { setActiveEventId } from '@/venue/activeEventStorage';
import { resolveActiveEventId } from '@/venue/eventSelection';
import type { EventResponse } from '@/types/generated-api';

export interface DashboardHomeProps {
  organizationName: string;
}

type PanelMode = 'closed' | 'create' | 'edit';

export function DashboardHome({ organizationName }: DashboardHomeProps) {
  const { logout } = useAuth();
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

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [editingEvent, setEditingEvent] = useState<EventResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventResponse | null>(null);
  const previousVenueIdRef = useRef<string | null>(activeVenueId);

  const createEvent = useCreateEvent(activeVenueId);
  const updateEvent = useUpdateEvent(activeVenueId, editingEvent?.eventId ?? null);
  const deleteEvent = useDeleteEvent(activeVenueId);

  useEffect(() => {
    if (!activeVenueId || eventsLoading) {
      return;
    }

    const venueChanged =
      previousVenueIdRef.current !== null &&
      previousVenueIdRef.current !== activeVenueId;

    if (venueChanged) {
      previousVenueIdRef.current = activeVenueId;
      setPanelMode('closed');
      setEditingEvent(null);
      setDeleteTarget(null);
      setSelectedEventId(resolveActiveEventId(events, activeVenueId));
      return;
    }

    previousVenueIdRef.current = activeVenueId;

    if (selectedEventId && events.some((event) => event.eventId === selectedEventId)) {
      return;
    }

    setSelectedEventId(resolveActiveEventId(events, activeVenueId));
  }, [activeVenueId, events, eventsLoading, selectedEventId]);

  const handleSelectEvent = (eventId: string) => {
    if (activeVenueId) {
      setActiveEventId(activeVenueId, eventId);
    }
    setSelectedEventId(eventId);
  };

  const handleCreateSuccess = (created: EventResponse) => {
    if (created.eventId && activeVenueId) {
      setActiveEventId(activeVenueId, created.eventId);
      setSelectedEventId(created.eventId);
    }
    setPanelMode('closed');
  };

  const showEventWorkspace = !isLoading && !isError && Boolean(activeVenueId);
  const showEventsEmpty =
    showEventWorkspace && !eventsLoading && !eventsError && events.length === 0;
  const showEventPanel = panelMode !== 'closed' && canManageEvents;
  const showLedger =
    showEventWorkspace &&
    !eventsLoading &&
    !eventsError &&
    events.length > 0 &&
    Boolean(selectedEventId) &&
    panelMode === 'closed' &&
    !deleteTarget;

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
            {showEventWorkspace && !eventsLoading && events.length > 0 ? (
              <EventCombobox
                events={events}
                selectedEventId={selectedEventId}
                canManageEvents={canManageEvents}
                onSelect={handleSelectEvent}
                onCreateClick={
                  canManageEvents
                    ? () => {
                        setEditingEvent(null);
                        setPanelMode('create');
                        setDeleteTarget(null);
                      }
                    : undefined
                }
                onEditClick={
                  canManageEvents
                    ? (event) => {
                        setEditingEvent(event);
                        setPanelMode('edit');
                        setDeleteTarget(null);
                      }
                    : undefined
                }
                onDeleteClick={
                  canManageEvents
                    ? (event) => {
                        setDeleteTarget(event);
                        setPanelMode('closed');
                        setEditingEvent(null);
                      }
                    : undefined
                }
              />
            ) : null}
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

      {showEventWorkspace && eventsLoading ? (
        <div className="dashboard-empty" role="status" aria-live="polite">
          Loading events…
        </div>
      ) : null}

      {showEventWorkspace && eventsError ? (
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

      {showEventsEmpty ? (
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
              onClick={() => {
                setEditingEvent(null);
                setPanelMode('create');
              }}
            >
              Create event
            </button>
          ) : null}
        </section>
      ) : null}

      {showEventPanel && panelMode === 'create' ? (
        <EventFormPanel
          mode="create"
          isPending={createEvent.isPending}
          onCancel={() => setPanelMode('closed')}
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

      {showEventPanel && panelMode === 'edit' && editingEvent ? (
        <EventFormPanel
          key={editingEvent.eventId}
          mode="edit"
          isPending={updateEvent.isPending}
          initialValues={{
            title: editingEvent.title ?? '',
            eventDate: editingEvent.eventDate ?? '',
            qboTagName: editingEvent.qboTagName ?? '',
          }}
          onCancel={() => {
            setPanelMode('closed');
            setEditingEvent(null);
          }}
          onSubmit={async (values) => {
            await updateEvent.mutateAsync({
              title: values.title,
              eventDate: values.eventDate,
              qboTagName: values.qboTagName || null,
            });
            setPanelMode('closed');
            setEditingEvent(null);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <EventDeleteConfirm
          eventTitle={deleteTarget.title ?? 'Event'}
          isPending={deleteEvent.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (!deleteTarget.eventId) {
              return;
            }
            const deletedId = deleteTarget.eventId;
            void deleteEvent.mutateAsync(deletedId).then(() => {
              setDeleteTarget(null);
              if (!activeVenueId) {
                return;
              }
              const remaining = events.filter((event) => event.eventId !== deletedId);
              setSelectedEventId(resolveActiveEventId(remaining, activeVenueId));
            });
          }}
        />
      ) : null}

      {showLedger && selectedEventId ? (
        <EventLedgerPage venueId={activeVenueId!} eventId={selectedEventId} />
      ) : null}

      {showEventWorkspace &&
      !eventsLoading &&
      !eventsError &&
      events.length > 0 &&
      !selectedEventId &&
      panelMode === 'closed' &&
      !deleteTarget ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>Unable to load the selected event.</p>
          <button
            type="button"
            className="dashboard-empty__retry"
            onClick={() => {
              if (activeVenueId) {
                setSelectedEventId(resolveActiveEventId(events, activeVenueId));
              }
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
