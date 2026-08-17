import { useEffect, useRef } from 'react';
import { ModalHeader } from '@/components/shell/ModalHeader';

export interface FestivalCancelConfirmProps {
  eventTitle: string;
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

export function FestivalCancelConfirm({
  eventTitle,
  open,
  onConfirm,
  onCancel,
  isPending = false,
  error = null,
}: FestivalCancelConfirmProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onCancel, isPending]);

  if (!open) {
    return null;
  }

  return (
    <div className="welcome-modal__backdrop" onClick={isPending ? undefined : onCancel} role="presentation">
      <section
        ref={dialogRef}
        className="team-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="festival-cancel-heading"
        aria-describedby="festival-cancel-description"
        tabIndex={-1}
        data-testid="festival-cancel-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Cancel booking?"
          titleId="festival-cancel-heading"
          onClose={onCancel}
          closeDisabled={isPending}
          titleClassName="team-confirm__heading"
        />
        <p id="festival-cancel-description" className="team-confirm__text">
          Cancel the booking for &ldquo;{eventTitle}&rdquo;? This deletes the festival from the
          calendar and cannot be undone.
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
            data-testid="festival-cancel-confirm-button"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {isPending ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </section>
    </div>
  );
}
