import { useEffect, useRef } from 'react';
import { ModalHeader } from '@/components/shell/ModalHeader';
import type { VenueResponse } from '@/types/generated-api';

export interface DeleteVenueConfirmProps {
  venue: VenueResponse;
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

export function DeleteVenueConfirm({
  venue,
  open,
  onConfirm,
  onCancel,
  isPending = false,
  error = null,
}: DeleteVenueConfirmProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="welcome-modal__backdrop" onClick={onCancel} role="presentation">
      <section
        ref={dialogRef}
        className="team-confirm"
        role="alertdialog"
        aria-labelledby="delete-venue-heading"
        aria-describedby="delete-venue-description"
        tabIndex={-1}
        data-testid="delete-venue-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Delete venue?"
          titleId="delete-venue-heading"
          onClose={onCancel}
          closeDisabled={isPending}
          titleClassName="team-confirm__heading"
        />
        <p id="delete-venue-description" className="team-confirm__text">
          Delete <strong>{venue.name}</strong>? This permanently removes the venue, its events,
          ledgers, and related data.
        </p>
        {error ? (
          <p className="team-confirm__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="team-confirm__actions">
          <button
            type="button"
            className="team-confirm__danger"
            data-testid="delete-venue-confirm-button"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : 'Delete venue'}
          </button>
        </div>
      </section>
    </div>
  );
}
