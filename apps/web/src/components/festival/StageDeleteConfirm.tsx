import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ModalHeader } from '@/components/shell/ModalHeader';

export interface StageDeleteConfirmProps {
  stageName: string;
  blockCount?: number;
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

export function StageDeleteConfirm({
  stageName,
  blockCount = 0,
  open,
  onConfirm,
  onCancel,
  isPending = false,
  error = null,
}: StageDeleteConfirmProps) {
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

  const blockWarning =
    blockCount > 0
      ? ` This stage still has ${blockCount} programming ${blockCount === 1 ? 'block' : 'blocks'}; deletion will fail until those blocks are moved or removed.`
      : '';

  return (
    <div
      className="welcome-modal__backdrop"
      onClick={isPending ? undefined : onCancel}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className="team-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="stage-delete-heading"
        aria-describedby="stage-delete-description"
        tabIndex={-1}
        data-testid="stage-delete-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Delete stage?"
          titleId="stage-delete-heading"
          onClose={onCancel}
          closeDisabled={isPending}
          titleClassName="team-confirm__heading"
        />
        <p id="stage-delete-description" className="team-confirm__text">
          Delete <strong>{stageName}</strong>? This removes the stage from the festival schedule.
          {blockWarning}
        </p>
        {error ? (
          <p className="team-confirm__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="team-confirm__actions">
          <button
            type="button"
            className="btn-primary--compact btn-primary--danger btn-icon-label"
            data-testid="stage-delete-confirm-button"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {!isPending ? <FontAwesomeIcon icon={faTrash} aria-hidden="true" /> : null}
            {isPending ? 'Deleting…' : 'Delete stage'}
          </button>
        </div>
      </section>
    </div>
  );
}
