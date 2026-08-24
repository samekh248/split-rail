import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faCalendarDays,
  faCheck,
  faCopy,
  faFileInvoiceDollar,
  faLayerGroup,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import { FestivalCancelConfirm } from '@/components/festival/FestivalCancelConfirm';
import { FestivalSetupModal } from '@/components/festival/FestivalSetupModal';
import { StageManagerPanel } from '@/components/festival/StageManagerPanel';
import { KebabMenu } from '@/components/shell/KebabMenu';
import { formatEventDateRange } from '@/lib/eventDateRange';
import { copyTextToClipboard } from '@/lib/copyToClipboard';
import { useFestival } from '@/api/festivals';
import { useDeleteEvent, useUpdateEvent } from '@/api/events';
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
 * Renders the active-festival day/stage structure. Standard (non-festival) events render
 * nothing here — the "Convert to festival" action for those lives in the ledger header
 * via {@link ConvertToFestivalAction}, so festival concepts never appear until the user
 * asks for them (spec FR-001).
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
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [tagCopied, setTagCopied] = useState(false);
  const isFestival = event?.eventType === 'FESTIVAL';
  const isFrozen = event?.status === 'SETTLED' || event?.status === 'RECONCILED';
  const isCancelled = event?.bookingPlacementStatus === 'CANCELLED';
  const updateEvent = useUpdateEvent(venueId, event?.eventId ?? null);
  const deleteEvent = useDeleteEvent(venueId);

  const festivalQuery = useFestival(venueId, event?.eventId ?? '', isFestival);

  useEffect(() => {
    setEditOpen(false);
    setCancelOpen(false);
    setCancelError(null);
    setTagCopied(false);
  }, [event?.eventId]);

  useEffect(() => {
    if (!tagCopied) {
      return;
    }
    const timer = window.setTimeout(() => setTagCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [tagCopied]);

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
    return null;
  }

  const festival = festivalQuery.data;
  const eventId = event.eventId ?? '';
  const masterTag = festival?.qboTagName ?? event.qboTagName ?? '';
  const canEditFestival = canManage && !isFrozen && !isCancelled;
  const canCancelBooking = canManageEvents && !isFrozen && !isCancelled;
  const eventStatus = event.status ?? 'PRE_SHOW';
  const eventMeta = [
    formatEventDateRange(event.eventDate, event.endDate),
    eventStatus.replace('_', '-'),
    event.isBudgetLocked ? 'Budget locked' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleCopyMasterTag = async () => {
    if (!masterTag) {
      return;
    }
    const copied = await copyTextToClipboard(masterTag);
    setTagCopied(copied);
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
        <div className="festival-mode-card__intro">
          <h2 className="festival-mode-card__title" data-testid="festival-event-title">
            <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" /> {event.title ?? 'Festival'}
          </h2>
          <p className="festival-mode-card__subtitle" data-testid="festival-event-meta">
            <span data-testid="festival-date-range">{eventMeta}</span>
          </p>
          <div className="festival-mode-card__tag" data-testid="festival-master-tag">
            {masterTag ? (
              <button
                type="button"
                className="festival-mode-card__tag-copy btn-icon-label"
                data-testid="festival-master-tag-copy"
                aria-label={tagCopied ? 'Copied QuickBooks tag' : `Copy QuickBooks tag ${masterTag}`}
                onClick={() => void handleCopyMasterTag()}
              >
                <span className="festival-mode-card__tag-value">{masterTag}</span>
                <FontAwesomeIcon
                  icon={tagCopied ? faCheck : faCopy}
                  className="festival-mode-card__tag-icon"
                  aria-hidden="true"
                />
              </button>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="section-header__actions">
          <button
            type="button"
            className="btn-secondary btn-icon-label"
            data-testid="festival-itinerary-link"
            onClick={() => navigateToFestivalItinerary(venueId, event.eventId ?? '')}
          >
            <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
            Itinerary
          </button>
          <button
            type="button"
            className="btn-secondary btn-icon-label"
            data-testid="festival-ledger-link"
            onClick={() => navigateToFestivalLedger(venueId, event.eventId ?? '')}
          >
            <FontAwesomeIcon icon={faFileInvoiceDollar} aria-hidden="true" />
            Master ledger
          </button>
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
                  icon: faBan,
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

      <div className="festival-mode-card__content">
        <StageManagerPanel venueId={venueId} eventId={event.eventId ?? ''} canManage={canManage} />
      </div>

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
