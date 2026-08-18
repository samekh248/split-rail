import { ModalHeader } from '@/components/shell/ModalHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

export interface EventDeleteConfirmProps {
  eventTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function EventDeleteConfirm({
  eventTitle,
  onConfirm,
  onCancel,
  isPending = false,
}: EventDeleteConfirmProps) {
  return (
    <section
      className="event-delete-confirm"
      role="alertdialog"
      aria-labelledby="event-delete-heading"
      aria-describedby="event-delete-description"
      data-testid="event-delete-confirm"
    >
      <ModalHeader
        title="Delete event?"
        titleId="event-delete-heading"
        onClose={onCancel}
        closeDisabled={isPending}
        titleClassName="event-delete-confirm__heading"
      />
      <p id="event-delete-description" className="event-delete-confirm__text">
        Permanently delete &ldquo;{eventTitle}&rdquo;? This cannot be undone.
      </p>
      <div className="event-delete-confirm__actions">
        <button
          type="button"
          className="btn-primary--compact btn-primary--danger btn-icon-label"
          data-testid="event-delete-confirm-button"
          onClick={onConfirm}
          disabled={isPending}
        >
          {!isPending ? <FontAwesomeIcon icon={faTrash} aria-hidden="true" /> : null}
          {isPending ? 'Deleting…' : 'Delete event'}
        </button>
      </div>
    </section>
  );
}
