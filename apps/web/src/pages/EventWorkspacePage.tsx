import { useEffect, useMemo, useRef, useState } from 'react';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { EventCombobox } from '@/components/event/EventCombobox';
import { EventFormPanel } from '@/components/event/EventFormPanel';
import { EventDeleteConfirm } from '@/components/event/EventDeleteConfirm';
import { useShellWorkspaceBar } from '@/components/shell/ShellWorkspaceBarContext';
import { useUserProfile } from '@/api/user';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/api/events';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import {
  buildEventWorkspacePath,
  navigateToDashboard,
  replacePath,
  useEventWorkspaceRoute,
} from '@/lib/appRoute';
import { navigateToCreateVenue } from '@/lib/dashboardRoute';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import { isRecognizedWorkspaceFocus } from '@/lib/workspaceFocusScroll';
import { setActiveEventId } from '@/venue/activeEventStorage';
import { resolveActiveEventId } from '@/venue/eventSelection';
import type { EventResponse } from '@/types/generated-api';

type PanelMode = 'closed' | 'create' | 'edit';

export function EventWorkspacePage() {
  const workspaceRoute = useEventWorkspaceRoute();
  const urlVenueId = workspaceRoute?.venueId ?? null;
  const urlEventId = workspaceRoute?.eventId ?? null;
  const ledgerFocus = isRecognizedWorkspaceFocus(workspaceRoute?.focus)
    ? workspaceRoute.focus
    : null;

  const { isLoading: profileLoading } = useUserProfile();
  const canManageVenues = useCanManageVenues();
  const canManageEvents = useCanManageEvents();
  const { venues, activeVenueId, isLoading, isError, refetch, activateVenueId } = useActiveVenue();
  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(activeVenueId);

  const [panelMode, setPanelMode] = useState<PanelMode>('closed');
  const [editingEvent, setEditingEvent] = useState<EventResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventResponse | null>(null);
  const [venueAccessDenied, setVenueAccessDenied] = useState(false);
  const venueSyncedRef = useRef(false);

  const createEvent = useCreateEvent(activeVenueId);
  const updateEvent = useUpdateEvent(activeVenueId, editingEvent?.eventId ?? null);
  const deleteEvent = useDeleteEvent(activeVenueId);

  useEffect(() => {
    if (isLoading || !urlVenueId) {
      return;
    }

    const venueAccessible = venues.some((venue) => venue.id === urlVenueId);
    if (!venueAccessible) {
      setVenueAccessDenied(true);
      navigateToDashboard();
      return;
    }

    setVenueAccessDenied(false);
    activateVenueId(urlVenueId);
    venueSyncedRef.current = true;
  }, [venues, isLoading, urlVenueId, activateVenueId]);

  useEffect(() => {
    if (!activeVenueId || !urlVenueId || !urlEventId || eventsLoading || activeVenueId !== urlVenueId) {
      return;
    }

    const eventValid = events.some((event) => event.eventId === urlEventId);
    if (eventValid) {
      setActiveEventId(activeVenueId, urlEventId);
      return;
    }

    const resolved = resolveActiveEventId(events, activeVenueId);
    if (resolved) {
      replacePath(buildEventWorkspacePath(activeVenueId, resolved));
    }
  }, [activeVenueId, urlVenueId, urlEventId, events, eventsLoading]);

  useEffect(() => {
    if (!venueSyncedRef.current || !activeVenueId || !urlVenueId || eventsLoading) {
      return;
    }
    if (activeVenueId === urlVenueId) {
      return;
    }

    const resolved = resolveActiveEventId(events, activeVenueId);
    if (resolved) {
      navigateToEventWorkspace(activeVenueId, resolved);
    }
  }, [activeVenueId, urlVenueId, events, eventsLoading]);

  const selectedEventId = useMemo(() => {
    if (!urlEventId || eventsLoading) {
      return null;
    }
    if (events.some((event) => event.eventId === urlEventId)) {
      return urlEventId;
    }
    return resolveActiveEventId(events, activeVenueId ?? '');
  }, [urlEventId, events, eventsLoading, activeVenueId]);

  const handleSelectEvent = (eventId: string) => {
    if (!activeVenueId) {
      return;
    }
    navigateToEventWorkspace(activeVenueId, eventId);
  };

  const handleCreateSuccess = (created: EventResponse) => {
    if (created.eventId && activeVenueId) {
      navigateToEventWorkspace(activeVenueId, created.eventId);
    }
    setPanelMode('closed');
  };

  const showEventWorkspace = !isLoading && !isError && Boolean(activeVenueId) && !venueAccessDenied;
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
      </div>
    ),
    [
      profileLoading,
      canManageVenues,
      showEventWorkspace,
      eventsLoading,
      events,
      selectedEventId,
      canManageEvents,
    ],
  );

  useShellWorkspaceBar(workspaceBarContent);

  return (
    <div className="dashboard-home">
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

      {venueAccessDenied ? (
        <div className="dashboard-empty dashboard-empty--error" role="alert">
          <p>You do not have access to this venue workspace.</p>
        </div>
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
            if (!deleteTarget.eventId || !activeVenueId) {
              return;
            }
            const deletedId = deleteTarget.eventId;
            void deleteEvent.mutateAsync(deletedId).then(() => {
              setDeleteTarget(null);
              const remaining = events.filter((event) => event.eventId !== deletedId);
              const nextEventId = resolveActiveEventId(remaining, activeVenueId);
              if (nextEventId) {
                navigateToEventWorkspace(activeVenueId, nextEventId);
              }
            });
          }}
        />
      ) : null}

      {showLedger && selectedEventId && activeVenueId ? (
        <EventLedgerPage venueId={activeVenueId} eventId={selectedEventId} focus={ledgerFocus} />
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
                const resolved = resolveActiveEventId(events, activeVenueId);
                if (resolved) {
                  navigateToEventWorkspace(activeVenueId, resolved);
                }
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
