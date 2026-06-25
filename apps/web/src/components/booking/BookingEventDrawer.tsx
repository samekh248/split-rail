import { useEffect, useRef, useState } from 'react';
import { useDeleteEvent, useUpdateEvent } from '@/api/events';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import type { BookingPlacement } from '@/lib/bookingCalendar';
import { placementStatusLabel } from '@/components/booking/BookingCalendarMatrix';

export interface BookingEventDrawerProps {
  open: boolean;
  placement: BookingPlacement | null;
  onClose: () => void;
  onUpdated: () => void;
}

type DrawerMode = 'detail' | 'edit';

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

  const updateEvent = useUpdateEvent(placement?.venueId ?? null, placement?.eventId ?? null);
  const deleteEvent = useDeleteEvent(placement?.venueId ?? null);

  useEffect(() => {
    if (!placement) {
      return;
    }
    setTitle(placement.title);
    setEventDate(placement.eventDate);
    setMode('detail');
    setError(null);
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

  return (
    <div
      className="booking-event-drawer"
      data-testid="booking-event-drawer"
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
      tabIndex={-1}
    >
      <header>
        <h2>{placement.title}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

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
    </div>
  );
}
