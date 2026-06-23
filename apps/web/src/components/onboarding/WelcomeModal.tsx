import { useEffect, useRef } from 'react';

export interface WelcomeModalProps {
  organizationName: string;
  onDismiss: () => void;
}

export function WelcomeModal({ organizationName, onDismiss }: WelcomeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onDismiss]);

  return (
    <div className="welcome-modal__backdrop" onClick={onDismiss} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="welcome-modal-title" className="welcome-modal__title">
          Welcome to Split Rail
        </h2>
        <p className="welcome-modal__body">
          Your organization <strong>{organizationName}</strong> is ready. You are set up as
          Admin and can start adding venues and events.
        </p>
        <button type="button" className="welcome-modal__dismiss btn-primary" onClick={onDismiss}>
          Get started
        </button>
      </div>
    </div>
  );
}
