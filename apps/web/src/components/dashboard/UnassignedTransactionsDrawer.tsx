import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useLedger } from '@/api/ledger';
import { useUnmappedTransactions } from '@/api/qbo';
import { InlineMappingDropdown } from '@/components/qbo/InlineMappingDropdown';
import { formatMoney } from '@/lib/money';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import type { UnmappedEventSummaryDto, VenueResponse } from '@/types/generated-api';

export interface UnassignedTransactionsDrawerProps {
  open: boolean;
  onClose: () => void;
  eventsWithUnmapped: UnmappedEventSummaryDto[];
  totalUnmappedCount: number;
  venues: VenueResponse[];
  isAllVenuesView: boolean;
  onRetry?: () => void;
}

function resolveVenueName(venues: VenueResponse[], venueId?: string | null): string {
  if (!venueId) {
    return 'Unknown venue';
  }
  return venues.find((venue) => venue.id === venueId)?.name ?? 'Unknown venue';
}

interface UnassignedEventAccordionRowProps {
  event: UnmappedEventSummaryDto;
  expanded: boolean;
  onToggle: () => void;
  venues: VenueResponse[];
  isAllVenuesView: boolean;
}

function UnassignedEventAccordionRow({
  event,
  expanded,
  onToggle,
  venues,
  isAllVenuesView,
}: UnassignedEventAccordionRowProps) {
  const venueId = event.venueId ?? '';
  const eventId = event.eventId ?? '';
  const { data: listData, isError: listError } = useUnmappedTransactions(venueId, eventId, expanded);
  const { data: ledger } = useLedger(venueId, eventId, { enabled: expanded });

  const lineItemOptions = (ledger?.blocks ?? [])
    .flatMap((block) => block.rows ?? [])
    .filter((row) => row.id)
    .map((row) => ({ id: row.id!, label: row.rowLabel ?? '' }));

  const venueLabel = isAllVenuesView ? `${resolveVenueName(venues, venueId)} · ` : '';

  const handleWorkspaceLink = (clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    if (!venueId || !eventId) {
      return;
    }
    navigateToEventWorkspace(venueId, eventId, 'sync');
  };

  return (
    <li className="unassigned-drawer__event" data-testid={`unassigned-event-row-${eventId}`}>
      <div className="unassigned-drawer__event-header">
        <button
          type="button"
          className="unassigned-drawer__event-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="unassigned-drawer__event-label">
            {venueLabel}
            {event.title}
            {event.eventDate ? ` · ${event.eventDate}` : ''}
          </span>
          <span className="unassigned-drawer__event-count">{event.unmappedCount ?? 0}</span>
        </button>
        <button
          type="button"
          className="unassigned-drawer__workspace-link"
          data-testid={`unassigned-event-workspace-link-${eventId}`}
          onClick={handleWorkspaceLink}
          aria-label={`Open ${event.title ?? 'event'} workspace sync`}
        >
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </button>
      </div>

      {expanded ? (
        <div className="unassigned-drawer__event-body" data-testid={`unassigned-event-list-${eventId}`}>
          {listError ? (
            <p role="alert" className="unassigned-drawer__row-error">
              Unable to load transactions for this event.
            </p>
          ) : null}
          <ul className="unassigned-drawer__transactions">
            {(listData?.transactions ?? []).map((txn) => (
              <li key={txn.id} className="unassigned-drawer__transaction">
                <span>{txn.qboAccountName}</span>
                <span>{formatMoney(txn.amount)}</span>
                <span>{txn.transactionDate}</span>
                <InlineMappingDropdown
                  venueId={venueId}
                  eventId={eventId}
                  transaction={txn}
                  lineItemOptions={lineItemOptions}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

export function UnassignedTransactionsDrawer({
  open,
  onClose,
  eventsWithUnmapped,
  totalUnmappedCount,
  venues,
  isAllVenuesView,
  onRetry,
}: UnassignedTransactionsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) {
      setExpandedEventIds(new Set());
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const showInconsistency =
    totalUnmappedCount > 0 && (eventsWithUnmapped?.length ?? 0) === 0;
  const showSuccess = totalUnmappedCount === 0;

  const toggleEvent = (eventId: string) => {
    setExpandedEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <div className="unassigned-drawer" data-testid="unassigned-drawer">
      <button
        type="button"
        className="unassigned-drawer__backdrop"
        aria-label="Close unassigned transactions drawer"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        className="unassigned-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unassigned-drawer-title"
        tabIndex={-1}
      >
        <header className="unassigned-drawer__header">
          <h2 id="unassigned-drawer-title" className="unassigned-drawer__title">
            Unassigned transactions
          </h2>
          <button
            type="button"
            className="unassigned-drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="unassigned-drawer__body">
          {showSuccess ? (
            <div
              className="unassigned-drawer__success"
              role="status"
              data-testid="unassigned-drawer-success"
            >
              All transactions are assigned. You can close this panel when ready.
            </div>
          ) : null}

          {showInconsistency ? (
            <div className="unassigned-drawer__error" role="alert">
              <p>Unable to load the event list. Counts may be out of date.</p>
              {onRetry ? (
                <button type="button" className="unassigned-drawer__retry" onClick={onRetry}>
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {!showSuccess && !showInconsistency ? (
            <ul className="unassigned-drawer__events">
              {eventsWithUnmapped.map((event) => {
                const eventId = event.eventId ?? '';
                return (
                  <UnassignedEventAccordionRow
                    key={`${event.venueId}:${eventId}`}
                    event={event}
                    expanded={expandedEventIds.has(eventId)}
                    onToggle={() => toggleEvent(eventId)}
                    venues={venues}
                    isAllVenuesView={isAllVenuesView}
                  />
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
