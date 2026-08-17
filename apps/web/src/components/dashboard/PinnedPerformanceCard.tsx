import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { PinToggleButton } from '@/components/PinToggleButton';
import { navigateToFestivalItinerary } from '@/lib/festivalItineraryRoute';
import type { PinnedPerformanceDto } from '@/types/generated-api';

export interface PinnedPerformanceCardProps {
  performance: PinnedPerformanceDto;
  onPinToggle: (venueId: string, eventId: string, blockId: string, isPinned: boolean) => void;
  onActivate: (venueId: string, eventId: string) => void;
}

function formatPerformanceWhen(performance: PinnedPerformanceDto): string {
  const date = performance.dayDate ?? '';
  const start = performance.startTime ?? '';
  const end = performance.endTime ?? '';
  const stage = performance.stageName?.trim();
  const when = [date, start && end ? `${start}–${end}` : start].filter(Boolean).join(' · ');
  return stage ? `${when} · ${stage}` : when;
}

export function PinnedPerformanceCard({
  performance,
  onPinToggle,
  onActivate,
}: PinnedPerformanceCardProps) {
  const blockId = performance.blockId ?? '';
  const eventId = performance.eventId ?? '';
  const venueId = performance.venueId ?? '';
  const title = performance.title?.trim() || 'Untitled performance';
  const festivalTitle = performance.festivalTitle?.trim() || 'Festival';
  const pinned = performance.isPinned !== false;

  return (
    <article
      className="event-card pinned-performance-card"
      data-testid={`pinned-performance-${blockId}`}
      onClick={() => {
        if (venueId && eventId) {
          onActivate(venueId, eventId);
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') {
          return;
        }
        if (venueId && eventId) {
          onActivate(venueId, eventId);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <header className="event-card__header">
        <div className="event-card__heading">
          <h3 className="event-card__title">{title}</h3>
          <p className="event-card__date" data-testid={`pinned-performance-festival-${blockId}`}>
            <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" /> {festivalTitle}
          </p>
        </div>
        <PinToggleButton
          pinned={pinned}
          pinnedLabel="Unpin performance"
          unpinnedLabel="Pin performance"
          testId={`pinned-performance-pin-${blockId}`}
          onToggle={() => {
            if (venueId && eventId && blockId) {
              onPinToggle(venueId, eventId, blockId, pinned);
            }
          }}
        />
      </header>
      <p className="pinned-performance-card__when" data-testid={`pinned-performance-when-${blockId}`}>
        <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" /> {formatPerformanceWhen(performance)}
      </p>
      <nav className="event-card__quick-links" aria-label="Performance actions">
        <button
          type="button"
          className="event-card__quick-link"
          data-testid={`pinned-performance-itinerary-${blockId}`}
          onClick={(event) => {
            event.stopPropagation();
            if (venueId && eventId) {
              navigateToFestivalItinerary(venueId, eventId);
            }
          }}
        >
          Open itinerary
        </button>
      </nav>
    </article>
  );
}
