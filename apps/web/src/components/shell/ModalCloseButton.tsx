import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export interface ModalCloseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  'data-testid'?: string;
  className?: string;
}

export function ModalCloseButton({
  onClick,
  disabled = false,
  'data-testid': testId,
  className = 'modal-close',
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      className={className}
      aria-label="Close"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
    </button>
  );
}
