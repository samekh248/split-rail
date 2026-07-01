import { useEffect, useRef } from 'react';
import { ModalHeader } from '@/components/shell/ModalHeader';

export interface QboDisconnectModalProps {
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function QboDisconnectModal({ pending, onConfirm, onCancel }: QboDisconnectModalProps) {
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
      data-testid="qbo-disconnect-modal"
    >
      <section
        ref={dialogRef}
        className="team-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="qbo-disconnect-title"
        aria-describedby="qbo-disconnect-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader
          title="Disconnect QuickBooks?"
          titleId="qbo-disconnect-title"
          onClose={onCancel}
          closeDisabled={pending}
          titleClassName="team-confirm__heading"
        />
        <p id="qbo-disconnect-description" className="team-confirm__text">
          Active credentials will be revoked and scheduled sync suspended. Cached transaction
          feeds and variance logs remain as frozen snapshots until you purge them.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn-outline" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary--compact"
            data-testid="qbo-disconnect-confirm"
            disabled={pending}
            onClick={onConfirm}
          >
            Disconnect Account
          </button>
        </div>
      </section>
    </div>
  );
}
