import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { EventCombobox } from '@/components/event/EventCombobox';
import { EventFormPanel } from '@/components/event/EventFormPanel';
import { EventDeleteConfirm } from '@/components/event/EventDeleteConfirm';
import { FestivalModeCard } from '@/components/festival/FestivalModeCard';
import { ConvertToFestivalAction } from '@/components/festival/ConvertToFestivalAction';
import { useShellWorkspaceBar } from '@/components/shell/ShellWorkspaceBarContext';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/api/events';
import { useCreateFestival } from '@/api/festivals';
import { useActiveVenue } from '@/venue/useActiveVenue';
import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { useCanManageFestivalSchedule } from '@/hooks/useFestivalPermissions';
import {
  buildEventWorkspacePath,
  navigateToBooking,
  navigateToDashboard,
  replacePath,
  useEventWorkspaceRoute,
} from '@/lib/appRoute';
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

  const canManageEvents = useCanManageEvents();
  const canManageFestivalSchedule = useCanManageFestivalSchedule();
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
  const [festivalEditEventId, setFestivalEditEventId] = useState<string | null>(null);
  const [venueAccessDenied, setVenueAccessDenied] = useState(false);
  const venueSyncedRef = useRef(false);
  const activeVenueIdRef = useRef(activeVenueId);
  const pendingUrlVenueRef = useRef<string | null>(null);
  activeVenueIdRef.current = activeVenueId;

  const createEvent = useCreateEvent(activeVenueId);
  const createFestival = useCreateFestival(activeVenueId ?? '');
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
    venueSyncedRef.current = true;
    // Only activate when the URL venue differs — activateVenueId invalidates all queries,
    // so re-running on every venues refetch would keep the workspace in a loading loop.
    if (activeVenueIdRef.current !== urlVenueId) {
      pendingUrlVenueRef.current = urlVenueId;
      activateVenueId(urlVenueId);
    }
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
      pendingUrlVenueRef.current = null;
      return;
    }

    // Calendar / deep-link navigation updates the URL before VenueProvider state catches up.
    // Do not remap to an event on the previous venue while that activation is in flight.
    if (pendingUrlVenueRef.current === urlVenueId) {
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
    // Do not fall back to another event while the URL venue is still syncing into
    // VenueProvider — that briefly (or permanently) shows the wrong show.
    if (!activeVenueId || activeVenueId !== urlVenueId) {
      return null;
    }
    return resolveActiveEventId(events, activeVenueId);
  }, [urlEventId, events, eventsLoading, activeVenueId, urlVenueId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEvent?.bookingPlacementStatus) {
      return;
    }
    if (
      selectedEvent.bookingPlacementStatus === 'HOLD_1'
      || selectedEvent.bookingPlacementStatus === 'HOLD_2'
    ) {
      navigateToBooking();
    }
  }, [selectedEvent]);

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

  const handleFestivalEditHandled = useCallback(() => {
    setFestivalEditEventId(null);
  }, []);

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
                    if (event.eventType === 'FESTIVAL') {
                      if (canManageFestivalSchedule && event.eventId) {
                        setFestivalEditEventId(event.eventId);
                      }
                      if (event.eventId && activeVenueId && event.eventId !== selectedEventId) {
                        navigateToEventWorkspace(activeVenueId, event.eventId);
                      }
                      setPanelMode('closed');
                      setEditingEvent(null);
                      setDeleteTarget(null);
                      return;
                    }
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
      showEventWorkspace,
      eventsLoading,
      events,
      selectedEventId,
      canManageEvents,
      canManageFestivalSchedule,
      activeVenueId,
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
          <button type="button" className="dashboard-empty__retry btn-primary" onClick={() => void refetch()}>
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
            className="dashboard-empty__retry btn-primary"
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
          isPending={createEvent.isPending || createFestival.isPending}
          onCancel={() => setPanelMode('closed')}
          onSubmit={async (values) => {
            const created = await createEvent.mutateAsync({
              title: values.title,
              eventDate: values.eventDate,
              qboTagName: values.qboTagName || null,
            });
            handleCreateSuccess(created);
          }}
          onCreateFestival={
            canManageFestivalSchedule
              ? async (values) => {
                  const festival = await createFestival.mutateAsync({
                    title: values.title,
                    startDate: values.startDate,
                    endDate: values.endDate,
                  });
                  if (festival.eventId && activeVenueId) {
                    navigateToEventWorkspace(activeVenueId, festival.eventId);
                  }
                  setPanelMode('closed');
                }
              : undefined
          }
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
        <div className="event-workspace" data-testid="event-workspace">
          <FestivalModeCard
            venueId={activeVenueId}
            event={selectedEvent}
            canManage={canManageFestivalSchedule}
            canManageEvents={canManageEvents}
            editRequestedEventId={festivalEditEventId}
            onEditRequestHandled={handleFestivalEditHandled}
            onBookingCancelled={({ deleted }) => {
              if (!deleted || !activeVenueId || !selectedEventId) {
                return;
              }
              const remaining = events.filter((item) => item.eventId !== selectedEventId);
              const nextEventId = resolveActiveEventId(remaining, activeVenueId);
              if (nextEventId) {
                navigateToEventWorkspace(activeVenueId, nextEventId);
              }
            }}
          />
          <EventLedgerPage
            venueId={activeVenueId}
            eventId={selectedEventId}
            focus={ledgerFocus}
            hideEventHeader={selectedEvent?.eventType === 'FESTIVAL'}
            extraHeaderActions={
              selectedEvent
              && selectedEvent.eventType !== 'FESTIVAL'
              && canManageFestivalSchedule
              && selectedEvent.status !== 'SETTLED'
              && selectedEvent.status !== 'RECONCILED' ? (
                <ConvertToFestivalAction venueId={activeVenueId} event={selectedEvent} />
              ) : undefined
            }
          />
        </div>
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
            className="dashboard-empty__retry btn-primary"
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
