import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faCheck,
  faCopy,
  faFileInvoiceDollar,
  faLayerGroup,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import { FestivalSetupModal } from '@/components/festival/FestivalSetupModal';
import { StageManagerPanel } from '@/components/festival/StageManagerPanel';
import { formatEventDateRange } from '@/lib/eventDateRange';
import { copyTextToClipboard } from '@/lib/copyToClipboard';
import { useFestival } from '@/api/festivals';
import { navigateToFestivalItinerary } from '@/lib/festivalItineraryRoute';
import { navigateToFestivalLedger } from '@/lib/festivalLedgerRoute';
import type { EventResponse } from '@/types/generated-api';

export interface FestivalModeCardProps {
  venueId: string;
  event: EventResponse | null;
  canManage: boolean;
  /** When this matches the current festival, open the edit-festival modal. */
  editRequestedEventId?: string | null;
  onEditRequestHandled?: () => void;
}

/**
 * Renders the active-festival day/stage structure. Standard (non-festival) events render
 * nothing here. Both the "Convert to festival" and "Cancel booking" actions live in the
 * ledger header kebab via {@link ConvertToFestivalAction}, so festival concepts never
 * appear until the user asks for them (spec FR-001).
 */
export function FestivalModeCard({
  venueId,
  event,
  canManage,
  editRequestedEventId = null,
  onEditRequestHandled,
}: FestivalModeCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [tagCopied, setTagCopied] = useState(false);
  const isFestival = event?.eventType === 'FESTIVAL';
  const isFrozen = event?.status === 'SETTLED' || event?.status === 'RECONCILED';
  const isCancelled = event?.bookingPlacementStatus === 'CANCELLED';

  const festivalQuery = useFestival(venueId, event?.eventId ?? '', isFestival);

  useEffect(() => {
    setEditOpen(false);
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

    </section>
  );
}
