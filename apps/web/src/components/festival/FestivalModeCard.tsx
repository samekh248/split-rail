import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faFileInvoiceDollar, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FestivalSetupModal } from '@/components/festival/FestivalSetupModal';
import { StageManagerPanel } from '@/components/festival/StageManagerPanel';
import { useFestival } from '@/api/festivals';
import { navigateToFestivalItinerary } from '@/lib/festivalItineraryRoute';
import { navigateToFestivalLedger } from '@/lib/festivalLedgerRoute';
import type { EventResponse } from '@/types/generated-api';

export interface FestivalModeCardProps {
  venueId: string;
  event: EventResponse | null;
  canManage: boolean;
}

function formatRange(startDate: string, endDate: string | null | undefined): string {
  if (!endDate || endDate === startDate) {
    return startDate;
  }
  return `${startDate} – ${endDate}`;
}

/**
 * Progressive-enhancement entry point. Standard events show only an opt-in affordance
 * (and nothing at all without manage permission); festivals show their day/stage structure.
 * Festival concepts never appear until the user asks for them (spec FR-001).
 */
export function FestivalModeCard({ venueId, event, canManage }: FestivalModeCardProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const isFestival = event?.eventType === 'FESTIVAL';

  const festivalQuery = useFestival(venueId, event?.eventId ?? '', isFestival);

  if (!event) {
    return null;
  }

  // A settled or reconciled event can no longer be restructured.
  const isFrozen = event.status === 'SETTLED' || event.status === 'RECONCILED';

  if (!isFestival) {
    if (!canManage || isFrozen) {
      return null;
    }

    return (
      <section className="festival-mode-card" data-testid="festival-mode-card">
        <div className="festival-mode-card__prompt">
          <p className="festival-mode-card__text">
            Running this over multiple days or stages?
          </p>
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

  return (
    <section className="festival-mode-card festival-mode-card--active" data-testid="festival-mode-card">
      <h2 className="festival-mode-card__title">
        <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" /> Festival
      </h2>

      <dl className="festival-mode-card__meta">
        <div>
          <dt>Dates</dt>
          <dd data-testid="festival-date-range">
            {formatRange(event.eventDate ?? '', event.endDate)}
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
    </section>
  );
}
