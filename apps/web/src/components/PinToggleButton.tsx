import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';

export interface PinToggleButtonProps {
  pinned: boolean;
  onToggle: () => void;
  pinnedLabel: string;
  unpinnedLabel: string;
  testId: string;
  className?: string;
  /** When true, shows a short text label beside the pin icon. */
  showLabel?: boolean;
}

export function PinToggleButton({
  pinned,
  onToggle,
  pinnedLabel,
  unpinnedLabel,
  testId,
  className = 'event-card__pin',
  showLabel = false,
}: PinToggleButtonProps) {
  const label = pinned ? 'Unpin' : 'Pin';

  return (
    <button
      type="button"
      className={[className, showLabel ? 'btn-icon-label' : ''].filter(Boolean).join(' ')}
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
        className={showLabel ? undefined : 'event-card__pin-icon'}
        aria-hidden="true"
      />
      {showLabel ? label : null}
    </button>
  );
}
