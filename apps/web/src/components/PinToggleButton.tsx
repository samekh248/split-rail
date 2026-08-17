import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';

export interface PinToggleButtonProps {
  pinned: boolean;
  onToggle: () => void;
  pinnedLabel: string;
  unpinnedLabel: string;
  testId: string;
  className?: string;
}

export function PinToggleButton({
  pinned,
  onToggle,
  pinnedLabel,
  unpinnedLabel,
  testId,
  className = 'event-card__pin',
}: PinToggleButtonProps) {
  return (
    <button
      type="button"
      className={className}
      aria-label={pinned ? pinnedLabel : unpinnedLabel}
      aria-pressed={pinned}
      data-testid={testId}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <FontAwesomeIcon
        icon={pinned ? faThumbtackSlash : faThumbtack}
        className="event-card__pin-icon"
        aria-hidden="true"
      />
    </button>
  );
}
