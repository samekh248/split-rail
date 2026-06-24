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
      <h2 id="event-delete-heading" className="event-delete-confirm__heading">
        Delete event?
      </h2>
      <p id="event-delete-description" className="event-delete-confirm__text">
        Permanently delete &ldquo;{eventTitle}&rdquo;? This cannot be undone.
      </p>
      <div className="event-delete-confirm__actions">
        <button type="button" onClick={onCancel} disabled={isPending}>
          Cancel
        </button>
        <button
          type="button"
          className="event-delete-confirm__danger"
          data-testid="event-delete-confirm-button"
          onClick={onConfirm}
          disabled={isPending}
        >
          Delete event
        </button>
      </div>
    </section>
  );
}
