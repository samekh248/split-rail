import { useEffect, useRef } from 'react';
import type { UserListResponse } from '@/types/generated-api';

export interface RemoveMemberConfirmProps {
  member: UserListResponse;
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

export function RemoveMemberConfirm({
  member,
  open,
  onConfirm,
  onCancel,
  isPending = false,
  error = null,
}: RemoveMemberConfirmProps) {
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
        aria-labelledby="remove-member-heading"
        aria-describedby="remove-member-description"
        tabIndex={-1}
        data-testid="remove-member-confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="remove-member-heading" className="team-confirm__heading">
          Remove member?
        </h2>
        <p id="remove-member-description" className="team-confirm__text">
          Remove <strong>{member.email}</strong> from your organization? They will lose access
          immediately.
        </p>
        {error ? (
          <p className="team-confirm__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="team-confirm__actions">
          <button type="button" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="team-confirm__danger"
            data-testid="remove-member-confirm-button"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {isPending ? 'Removing…' : 'Remove member'}
          </button>
        </div>
      </section>
    </div>
  );
}
