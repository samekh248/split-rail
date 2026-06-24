import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faThumbtackSlash } from '@fortawesome/free-solid-svg-icons';

export type NavPinButtonVariant = 'pin' | 'unpin';

export interface NavPinButtonProps {
  variant: NavPinButtonVariant;
  onClick: () => void;
}

export function NavPinButton({ variant, onClick }: NavPinButtonProps) {
  const isPin = variant === 'pin';

  return (
    <button
      type="button"
      className={`nav-pin-button nav-pin-button--${variant}`}
      aria-label={isPin ? 'Pin navigation' : 'Unpin navigation'}
      data-testid={isPin ? 'sidebar-nav-pin' : 'sidebar-nav-unpin'}
      onClick={onClick}
    >
      <FontAwesomeIcon
        icon={isPin ? faThumbtack : faThumbtackSlash}
        className="nav-pin-button__icon"
        aria-hidden="true"
      />
    </button>
  );
}
