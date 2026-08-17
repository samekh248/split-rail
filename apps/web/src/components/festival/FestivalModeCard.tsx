import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faFileInvoiceDollar, faLayerGroup, faPen } from '@fortawesome/free-solid-svg-icons';
import { FestivalCancelConfirm } from '@/components/festival/FestivalCancelConfirm';
import { FestivalSetupModal } from '@/components/festival/FestivalSetupModal';
import { StageManagerPanel } from '@/components/festival/StageManagerPanel';
import { PinToggleButton } from '@/components/PinToggleButton';
import { KebabMenu } from '@/components/shell/KebabMenu';
import { formatEventDateRange } from '@/lib/eventDateRange';
import { useFestival } from '@/api/festivals';
import { useDeleteEvent, useUpdateEvent } from '@/api/events';
import { usePinEvent, useUnpinEvent } from '@/api/dashboard';
import { navigateToFestivalItinerary } from '@/lib/festivalItineraryRoute';
import { navigateToFestivalLedger } from '@/lib/festivalLedgerRoute';
import type { EventResponse } from '@/types/generated-api';

export interface FestivalModeCardProps {
  venueId: string;
  event: EventResponse | null;
  canManage: boolean;
  canManageEvents?: boolean;
  /** When this matches the current festival, open the edit-festival modal. */
  editRequestedEventId?: string | null;
  onEditRequestHandled?: () => void;
  onBookingCancelled?: (result: { deleted: boolean }) => void;
}

function isHoldPlacement(status: string | null | undefined): boolean {
  return status === 'HOLD_1' || status === 'HOLD_2';
}

/**
 * Progressive-enhancement entry point. Standard events show only an opt-in affordance
 * (and nothing at all without manage permission); festivals show their day/stage structure.
 * Festival concepts never appear until the user asks for them (spec FR-001).
 */
export function FestivalModeCard({
  venueId,
  event,
  canManage,
  canManageEvents = false,
  editRequestedEventId = null,
  onEditRequestHandled,
  onBookingCancelled,
}: FestivalModeCardProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const isFestival = event?.eventType === 'FESTIVAL';
  const isFrozen = event?.status === 'SETTLED' || event?.status === 'RECONCILED';
  const isCancelled = event?.bookingPlacementStatus === 'CANCELLED';
  const pinEvent = usePinEvent();
  const unpinEvent = useUnpinEvent();
  const updateEvent = useUpdateEvent(venueId, event?.eventId ?? null);
  const deleteEvent = useDeleteEvent(venueId);

  const festivalQuery = useFestival(venueId, event?.eventId ?? '', isFestival);

  useEffect(() => {
    setEditOpen(false);
    setCancelOpen(false);
    setCancelError(null);
  }, [event?.eventId]);

  useEffect(() => {
    if (
      editRequestedEventId &&
      editRequestedEventId === event?.eventId &&
      canManage &&
      isFestival &&
      !isFrozen &&
      !isCancelled
    ) {
      setEditOpen(true);
      onEditRequestHandled?.();
    }
  }, [
    editRequestedEventId,
    event?.eventId,
    canManage,
    isFestival,
    isFrozen,
    isCancelled,
    onEditRequestHandled,
  ]);

  if (!event) {
    return null;
  }

  if (!isFestival) {
    if (!canManage || isFrozen) {
      return null;
    }

    return (
      <section className="festival-mode-card" data-testid="festival-mode-card">
        <div className="festival-mode-card__prompt section-header">
          <p className="festival-mode-card__text">
            Running this over multiple days or stages?
          </p>
          <div className="section-header__actions">
            <button
              type="button"
              className="festival-mode-card__convert btn-icon-label"
              data-testid="festival-convert-button"
              onClick={() => setSetupOpen(true)}
            >
              <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" />
              Convert to festival
            </button>
          </div>
        </div>

        <FestivalSetupModal
          venueId={venueId}
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          onCreated={() => setSetupOpen(false)}
          existingEventId={event.eventId}
          initialTitle={event.title ?? ''}
          initialStartDate={event.eventDate ?? ''}
        />
      </section>
    );
  }

  const festival = festivalQuery.data;
  const eventId = event.eventId ?? '';
  const isPinned = event.isPinned === true;
  const canEditFestival = canManage && !isFrozen && !isCancelled;
  const canCancelBooking = canManageEvents && !isFrozen && !isCancelled;

  const toggleFestivalPin = () => {
    if (!eventId) {
      return;
    }
    const mutation = isPinned ? unpinEvent : pinEvent;
    mutation.mutate({ venueId, eventId });
  };

  const handleCancelConfirm = async () => {
    setCancelError(null);
    try {
      const isHold = isHoldPlacement(event.bookingPlacementStatus);
      if (isHold) {
        await deleteEvent.mutateAsync(eventId);
      } else {
        await updateEvent.mutateAsync({
          title: event.title,
          eventDate: event.eventDate,
          qboTagName: event.qboTagName ?? null,
          bookingPlacementStatus: 'CANCELLED',
        });
      }
      setCancelOpen(false);
      onBookingCancelled?.({ deleted: isHold });
    } catch (caught) {
      setCancelError(caught instanceof Error ? caught.message : 'Unable to cancel booking.');
    }
  };

  return (
    <section className="festival-mode-card festival-mode-card--active" data-testid="festival-mode-card">
      <div className="festival-mode-card__heading section-header">
        <h2 className="festival-mode-card__title">
          <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" /> Festival
        </h2>
        <div className="section-header__actions">
          <PinToggleButton
            pinned={isPinned}
            pinnedLabel="Unpin festival"
            unpinnedLabel="Pin festival"
            testId={`festival-pin-${eventId}`}
            onToggle={toggleFestivalPin}
          />
          {canEditFestival ? (
            <button
              type="button"
              className="btn-primary--compact btn-icon-label"
              data-testid="festival-edit-button"
              onClick={() => setEditOpen(true)}
            >
              <FontAwesomeIcon icon={faPen} aria-hidden="true" />
              Edit festival
            </button>
          ) : null}
          {canCancelBooking ? (
            <KebabMenu
              ariaLabel="More festival actions"
              testId="festival-actions-menu"
              items={[
                {
                  label: 'Cancel booking',
                  testId: 'festival-cancel-booking',
                  destructive: true,
                  onSelect: () => {
                    setCancelError(null);
                    setCancelOpen(true);
                  },
                },
              ]}
            />
          ) : null}
        </div>
      </div>

      <dl className="festival-mode-card__meta">
        <div>
          <dt>Dates</dt>
          <dd data-testid="festival-date-range">
            {formatEventDateRange(event.eventDate, event.endDate)}
          </dd>
        </div>
        <div>
          <dt>Days</dt>
          <dd data-testid="festival-day-total">{festival?.days?.length ?? '—'}</dd>
        </div>
        <div>
          <dt>QuickBooks tag</dt>
          <dd data-testid="festival-master-tag">{festival?.qboTagName ?? event.qboTagName}</dd>
        </div>
      </dl>

      <StageManagerPanel venueId={venueId} eventId={event.eventId ?? ''} canManage={canManage} />

      <nav className="festival-mode-card__links" aria-label="Festival views">
        <button
          type="button"
          className="btn-icon-label festival-mode-card__link"
          data-testid="festival-itinerary-link"
          onClick={() => navigateToFestivalItinerary(venueId, event.eventId ?? '')}
        >
          <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
          Itinerary
        </button>
        <button
          type="button"
          className="btn-icon-label festival-mode-card__link"
          data-testid="festival-ledger-link"
          onClick={() => navigateToFestivalLedger(venueId, event.eventId ?? '')}
        >
          <FontAwesomeIcon icon={faFileInvoiceDollar} aria-hidden="true" />
          Master ledger
        </button>
      </nav>

      <FestivalSetupModal
        mode="edit"
        venueId={venueId}
        eventId={eventId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onCreated={() => setEditOpen(false)}
        initialTitle={event.title ?? ''}
        initialStartDate={event.eventDate ?? ''}
        initialEndDate={event.endDate ?? event.eventDate ?? ''}
      />

      <FestivalCancelConfirm
        eventTitle={event.title ?? 'Festival'}
        open={cancelOpen}
        isPending={updateEvent.isPending || deleteEvent.isPending}
        error={cancelError}
        onCancel={() => {
          if (updateEvent.isPending || deleteEvent.isPending) {
            return;
          }
          setCancelOpen(false);
          setCancelError(null);
        }}
        onConfirm={() => void handleCancelConfirm()}
      />
    </section>
  );
}
