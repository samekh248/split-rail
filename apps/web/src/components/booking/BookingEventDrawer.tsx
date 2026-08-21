import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';
import { useDeleteEvent, useUpdateEvent } from '@/api/events';
import { useDashboard, usePinEvent, useUnpinEvent } from '@/api/dashboard';
import { useUserProfile } from '@/api/user';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { KebabMenu } from '@/components/shell/KebabMenu';
import { FormField } from '@/components/auth/FormField';
import { formatEventDateRangeLong } from '@/lib/eventDateRange';
import { formatTimeWithPreference } from '@/lib/timeDisplayFormat';
import {
  bookingStatusSwatchClass,
  formatBookingStatusLabel,
  type BookingPlacement,
} from '@/lib/bookingCalendar';
import type { DashboardResponse } from '@/types/generated-api';

const MAX_NOTES_LENGTH = 2000;

function DetailGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="booking-event-drawer__group">
      <h3 className="booking-event-drawer__group-heading">{heading}</h3>
      <div className="booking-event-drawer__group-body">{children}</div>
    </div>
  );
}

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
  const [doorsTime, setDoorsTime] = useState('');
  const [showStartTime, setShowStartTime] = useState('');
  const [supportLineup, setSupportLineup] = useState('');
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);
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
    setDoorsTime(placement.doorsTime ?? '');
    setShowStartTime(placement.showStartTime ?? '');
    setSupportLineup(placement.supportLineup ?? '');
    setNotes(placement.notes ?? '');
    setMode('detail');
    setError(null);
    setNotesError(null);
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
    if (notes.length > MAX_NOTES_LENGTH) {
      setNotesError(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`);
      return;
    }
    setNotesError(null);
    try {
      await updateEvent.mutateAsync({
        title,
        eventDate,
        qboTagName: null,
        // Always send the current state value for every field below, even ones not currently
        // rendered (e.g. showStartTime while on a hold) — gating on visibility here would
        // silently clear a retained value and violate FR-006.
        doorsTime: doorsTime || null,
        showStartTime: showStartTime || null,
        supportLineup: supportLineup || null,
        notes: notes || null,
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

  const showCancelAction = placement.eventType !== 'FESTIVAL' || isHold;
  const cancelActionLabel = isHold ? 'Release hold' : 'Cancel booking';

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
        <div className="booking-event-drawer__body">
          <div className="booking-event-drawer__summary">
            <p
              className={`booking-event-drawer__status booking-event-drawer__status--${placement.bookingPlacementStatus.toLowerCase().replace('_', '-')}`}
              data-testid="booking-event-drawer-status"
            >
              <span
                className={`booking-calendar-legend__swatch ${bookingStatusSwatchClass(placement.bookingPlacementStatus)}`}
                aria-hidden="true"
              />
              {formatBookingStatusLabel(placement.bookingPlacementStatus)}
            </p>
            <dl className="booking-event-drawer__meta">
              <div className="booking-event-drawer__meta-item">
                <dt>Venue</dt>
                <dd data-testid="booking-event-drawer-venue">{placement.venueName}</dd>
              </div>
              <div className="booking-event-drawer__meta-item">
                <dt>Date</dt>
                <dd className="booking-event-drawer__date" data-testid="booking-event-drawer-date">
                  {formatEventDateRangeLong(placement.eventDate, placement.endDate)}
                </dd>
              </div>
            </dl>
          </div>

          <DetailGroup heading="Schedule">
            {(() => {
              // A retained show start time stays hidden while off-confirmed (FR-006) — it
              // reappears once the placement returns to confirmed, rather than leaking through
              // detail view regardless of status.
              const visibleShowStartTime =
                placement.bookingPlacementStatus === 'CONFIRMED' ? placement.showStartTime : null;
              return placement.doorsTime || visibleShowStartTime ? (
                <ul className="booking-event-drawer__schedule-list">
                  {placement.doorsTime ? (
                    <li>Doors: {formatTimeWithPreference(placement.doorsTime)}</li>
                  ) : null}
                  {visibleShowStartTime ? (
                    <li>Show start: {formatTimeWithPreference(visibleShowStartTime)}</li>
                  ) : null}
                </ul>
              ) : (
                <p className="booking-event-drawer__group-empty">No schedule times set.</p>
              );
            })()}
          </DetailGroup>

          {placement.supportLineup ? (
            <DetailGroup heading="Lineup">
              <p className="booking-event-drawer__lineup-text">{placement.supportLineup}</p>
            </DetailGroup>
          ) : null}

          {placement.notes ? (
            <DetailGroup heading="Notes">
              <p className="booking-event-drawer__notes-text">{placement.notes}</p>
            </DetailGroup>
          ) : null}

          <div className="booking-event-drawer__actions section-header">
            <div className="booking-event-drawer__secondary-actions">
              {placement.eventType === 'FESTIVAL' || placement.workspaceAllowed ? null : (
                <button type="button" onClick={() => setMode('edit')}>
                  Edit
                </button>
              )}
              {isHold ? (
                <button type="button" onClick={handlePromote}>
                  Promote
                </button>
              ) : null}
              {showCancelAction ? (
                <KebabMenu
                  ariaLabel="More booking actions"
                  testId="booking-event-drawer-actions-menu"
                  items={[
                    {
                      label: cancelActionLabel,
                      testId: 'booking-event-drawer-cancel-booking',
                      destructive: true,
                      onSelect: () => void handleDelete(),
                    },
                  ]}
                />
              ) : null}
            </div>
            {placement.workspaceAllowed ? (
              <div className="section-header__actions">
                <button
                  type="button"
                  className="btn-primary"
                  data-testid="booking-event-drawer-open-workspace"
                  onClick={() =>
                    navigateToEventWorkspace(placement.venueId, placement.eventId)
                  }
                >
                  Open workspace
                </button>
              </div>
            ) : null}
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
          {placement.eventType === 'FESTIVAL' ? (
            <p className="booking-event-drawer__date" data-testid="booking-event-drawer-date">
              {formatEventDateRangeLong(placement.eventDate, placement.endDate)}
            </p>
          ) : (
            <label>
              Date
              <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            </label>
          )}
          <FormField
            id="booking-event-doors-time"
            label="Doors time"
            type="time"
            value={doorsTime}
            onChange={setDoorsTime}
          />
          {placement.bookingPlacementStatus === 'CONFIRMED' ? (
            <FormField
              id="booking-event-show-start-time"
              label="Show start time"
              type="time"
              value={showStartTime}
              onChange={setShowStartTime}
            />
          ) : null}
          <label className="booking-event-drawer__field">
            Supporting lineup
            <textarea
              value={supportLineup}
              onChange={(event) => setSupportLineup(event.target.value)}
            />
          </label>
          <label className="booking-event-drawer__field">
            Notes
            <textarea
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setNotesError(null);
              }}
            />
          </label>
          {notesError ? <p role="alert">{notesError}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit">Save</button>
        </form>
      )}
      {mode === 'detail' && error ? <p role="alert">{error}</p> : null}
      {mode === 'detail' && pinError ? <p role="alert">{pinError}</p> : null}
    </div>
  );
}
