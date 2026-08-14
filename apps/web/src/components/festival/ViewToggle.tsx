import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import type { ItineraryViewMode } from '@/lib/itineraryViewStorage';

export interface ViewToggleProps {
  mode: ItineraryViewMode;
  onChange: (mode: ItineraryViewMode) => void;
  canPublish?: boolean;
  onPublishToggle?: (isPublic: boolean) => void;
  publishPending?: boolean;
  selectedBlockIsPublic?: boolean;
  hasSelectedBlock?: boolean;
}

export function ViewToggle({
  mode,
  onChange,
  canPublish = false,
  onPublishToggle,
  publishPending = false,
  selectedBlockIsPublic = false,
  hasSelectedBlock = false,
}: ViewToggleProps) {
  const activeLabel = mode === 'public' ? 'Public view' : 'Internal view';

  return (
    <div className="festival-view-toggle" data-testid="festival-view-toggle">
      <p className="festival-view-toggle__active-label" data-testid="festival-view-active-label">
        Viewing: {activeLabel}
      </p>

      <div className="festival-view-toggle__controls" role="group" aria-label="Itinerary view">
        <button
          type="button"
          className={[
            'festival-view-toggle__button',
            mode === 'internal' ? 'festival-view-toggle__button--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="festival-view-internal"
          aria-pressed={mode === 'internal'}
          onClick={() => onChange('internal')}
        >
          <FontAwesomeIcon icon={faEyeSlash} aria-hidden="true" />
          Internal
        </button>
        <button
          type="button"
          className={[
            'festival-view-toggle__button',
            mode === 'public' ? 'festival-view-toggle__button--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid="festival-view-public"
          aria-pressed={mode === 'public'}
          onClick={() => onChange('public')}
        >
          <FontAwesomeIcon icon={faEye} aria-hidden="true" />
          Public
        </button>
      </div>

      {canPublish && hasSelectedBlock ? (
        <label className="festival-view-toggle__publish">
          <input
            type="checkbox"
            data-testid="festival-publish-visibility"
            checked={selectedBlockIsPublic}
            disabled={publishPending}
            onChange={(event) => onPublishToggle?.(event.target.checked)}
          />
          Show on public itinerary
        </label>
      ) : null}
    </div>
  );
}
