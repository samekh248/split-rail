import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ModalHeader } from '@/components/shell/ModalHeader';
import type { RegionResponse } from '@/types/generated-api';

export interface DeleteRegionConfirmProps {
  region: RegionResponse;
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

export function DeleteRegionConfirm({
  region,
  open,
  onConfirm,
  onCancel,
  isPending = false,
  error = null,
}: DeleteRegionConfirmProps) {
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
    <div
      className="welcome-modal__backdrop"
      onClick={(event) => {
        event.stopPropagation();
        onCancel();
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className="team-confirm"
        role="alertdialog"
        aria-labelledby="delete-region-heading"
        aria-describedby="delete-region-description"
        tabIndex={-1}
        data-testid="delete-region-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Delete region?"
          titleId="delete-region-heading"
          onClose={onCancel}
          closeDisabled={isPending}
          titleClassName="team-confirm__heading"
        />
        <p id="delete-region-description" className="team-confirm__text">
          Delete <strong>{region.name}</strong>? This cannot be undone.
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
            data-testid="delete-region-confirm-button"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {isPending ? null : <FontAwesomeIcon icon={faTrash} aria-hidden="true" />}
            {isPending ? 'Deleting…' : 'Delete region'}
          </button>
        </div>
      </section>
    </div>
  );
}
