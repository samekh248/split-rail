import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';
import { useDeleteEvent, useUpdateEvent } from '@/api/events';
import { useDashboard, usePinEvent, useUnpinEvent } from '@/api/dashboard';
import { useUserProfile } from '@/api/user';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import { ModalHeader } from '@/components/shell/ModalHeader';
import type { BookingPlacement } from '@/lib/bookingCalendar';
import { placementStatusLabel } from '@/components/booking/BookingCalendarMatrix';
import type { DashboardResponse } from '@/types/generated-api';

export interface BookingEventDrawerProps {
  open: boolean;
  placement: BookingPlacement | null;
  onClose: () => void;
  onUpdated: () => void;
}

type DrawerMode = 'detail' | 'edit';

function isEventPinnedOnDashboard(dashboard: DashboardResponse | undefined, eventId: string): boolean {
  if (!dashboard || !eventId) {
    return false;
  }

  const partitions = [
    ...(dashboard.pinnedEvents ?? []),
    ...(dashboard.tonightEvents ?? []),
    ...(dashboard.upcomingEvents ?? []),
    ...(dashboard.recentEvents ?? []),
  ];

  return partitions.some((event) => event.eventId === eventId && event.isPinned === true);
}

export function BookingEventDrawer({
  open,
  placement,
  onClose,
  onUpdated,
}: BookingEventDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DrawerMode>('detail');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const { data: profile } = useUserProfile();
  const { data: dashboard } = useDashboard(placement?.venueId ?? null);
  const pinEvent = usePinEvent();
  const unpinEvent = useUnpinEvent();
  const updateEvent = useUpdateEvent(placement?.venueId ?? null, placement?.eventId ?? null);
  const deleteEvent = useDeleteEvent(placement?.venueId ?? null);

  const canPin = profile?.role?.permissions?.canViewFinancials === true;
  const isPinned = useMemo(
    () => isEventPinnedOnDashboard(dashboard, placement?.eventId ?? ''),
    [dashboard, placement?.eventId],
  );

  useEffect(() => {
    if (!placement) {
      return;
    }
    setTitle(placement.title);
    setEventDate(placement.eventDate);
    setMode('detail');
    setError(null);
    setPinError(null);
  }, [placement]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !placement) {
    return null;
  }

  const isHold = placement.bookingPlacementStatus === 'HOLD_1'
    || placement.bookingPlacementStatus === 'HOLD_2';

  const handleSave = async () => {
    setError(null);
    try {
      await updateEvent.mutateAsync({
        title,
        eventDate,
        qboTagName: null,
        doorsTime: placement.doorsTime,
      });
      onUpdated();
      setMode('detail');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to save changes.';
      setError(message.includes('409') ? 'Booking conflict on the selected date.' : message);
    }
  };

  const handlePromote = async () => {
    setError(null);
    try {
      await updateEvent.mutateAsync({
        title: placement.title,
        eventDate: placement.eventDate,
        qboTagName: null,
        bookingPlacementStatus: 'CONFIRMED',
      });
      onUpdated();
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to promote hold.';
      setError(message.includes('409') ? 'Booking conflict prevents promotion.' : message);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      if (isHold) {
        await deleteEvent.mutateAsync(placement.eventId);
      } else {
        await updateEvent.mutateAsync({
          title: placement.title,
          eventDate: placement.eventDate,
          qboTagName: null,
          bookingPlacementStatus: 'CANCELLED',
        });
      }
      onUpdated();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete placement.');
    }
  };

  const handlePinToggle = () => {
    if (!placement?.venueId || !placement.eventId) {
      return;
    }
    setPinError(null);
    const mutation = isPinned ? unpinEvent : pinEvent;
    mutation.mutate(
      { venueId: placement.venueId, eventId: placement.eventId },
      {
        onError: (caught) => {
          setPinError(
            caught instanceof Error ? caught.message : 'Unable to update pin. Please try again.',
          );
        },
      },
    );
  };

  const pinButton = canPin ? (
    <button
      type="button"
      className="event-card__pin"
      aria-label={isPinned ? 'Unpin event' : 'Pin event'}
      data-testid={`booking-event-drawer-pin-${placement.eventId}`}
      onClick={handlePinToggle}
    >
      <FontAwesomeIcon
        icon={isPinned ? faThumbtackSlash : faThumbtack}
        className="event-card__pin-icon"
        aria-hidden="true"
      />
    </button>
  ) : null;

  return (
    <div
      className="booking-event-drawer"
      data-testid="booking-event-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-event-drawer-title"
      ref={dialogRef}
      tabIndex={-1}
    >
      <ModalHeader
        title={placement.title}
        titleId="booking-event-drawer-title"
        onClose={onClose}
        closeTestId="booking-event-drawer-close"
        titleAction={pinButton}
      />

      {mode === 'detail' ? (
        <div>
          <p>{placement.venueName}</p>
          <p>{placement.eventDate}</p>
          <p>{placementStatusLabel(placement.bookingPlacementStatus)}</p>
          <div className="booking-event-drawer__actions">
            <button type="button" onClick={() => setMode('edit')}>
              Edit
            </button>
            {isHold ? (
              <button type="button" onClick={handlePromote}>
                Promote
              </button>
            ) : null}
            {placement.workspaceAllowed ? (
              <button
                type="button"
                onClick={() =>
                  navigateToEventWorkspace(placement.venueId, placement.eventId)
                }
              >
                Open workspace
              </button>
            ) : null}
            <button type="button" onClick={handleDelete}>
              {isHold ? 'Release hold' : 'Cancel booking'}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Date
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit">Save</button>
        </form>
      )}
      {mode === 'detail' && error ? <p role="alert">{error}</p> : null}
      {mode === 'detail' && pinError ? <p role="alert">{pinError}</p> : null}
    </div>
  );
}
