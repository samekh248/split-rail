import { useEffect, useRef } from 'react';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { useQboPurgeCache } from '@/api/qbo';

export interface QboPurgeCacheModalProps {
  venueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QboPurgeCacheModal({ venueId, onSuccess, onCancel }: QboPurgeCacheModalProps) {
  const purgeMutation = useQboPurgeCache(venueId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
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
  }, [onCancel]);

  return (
    <div
      className="welcome-modal__backdrop"
      onClick={onCancel}
      role="presentation"
      data-testid="qbo-purge-modal"
    >
      <section
        ref={dialogRef}
        className="team-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="qbo-purge-title"
        aria-describedby="qbo-purge-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Clear cached QuickBooks data?"
          titleId="qbo-purge-title"
          onClose={onCancel}
          closeDisabled={purgeMutation.isPending}
          titleClassName="team-confirm__heading"
        />
        <p id="qbo-purge-description" className="team-confirm__text">
          Are you sure you want to permanently clear all cached QuickBooks transaction mappings
          from Split-Rail? This will wipe out all historical variance metrics.
        </p>
        <div className="modal__actions">
          <button
            type="button"
            className="btn-outline"
            disabled={purgeMutation.isPending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary--compact"
            data-testid="qbo-purge-confirm"
            disabled={purgeMutation.isPending}
            onClick={() => {
              purgeMutation.mutate(undefined, { onSuccess });
            }}
          >
            Clear Cached QBO Data
          </button>
        </div>
      </section>
    </div>
  );
}
