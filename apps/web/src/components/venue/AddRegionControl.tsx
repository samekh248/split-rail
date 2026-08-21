import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FormField } from '@/components/auth/FormField';
import { ModalHeader } from '@/components/shell/ModalHeader';

export interface AddRegionControlProps {
  pending?: boolean;
  error?: string | null;
  submitLabel?: string;
  onSubmit: (name: string) => Promise<boolean>;
}

export function AddRegionControl({
  pending = false,
  error,
  submitLabel = 'Add region',
  onSubmit,
}: AddRegionControlProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = () => {
    if (pending) {
      return;
    }
    setOpen(false);
    setName('');
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        setOpen(false);
        setName('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, pending]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await onSubmit(name);
    if (saved) {
      setOpen(false);
      setName('');
    }
  };

  return (
    <div className="add-region-control" data-testid="add-region-control">
      <button
        type="button"
        className="btn-secondary btn-icon-label"
        data-testid="venues-add-region-open"
        onClick={() => setOpen(true)}
      >
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {submitLabel}
      </button>

      {open ? (
        <div className="welcome-modal__backdrop" onClick={close} role="presentation">
          <div
            ref={dialogRef}
            className="welcome-modal team-modal venue-modal-form region-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-region-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            data-testid="venues-add-region"
          >
            <ModalHeader
              title={submitLabel}
              titleId="add-region-title"
              onClose={close}
              closeDisabled={pending}
              closeTestId="venues-add-region-close"
            />
            <form className="region-modal__form" onSubmit={(event) => void handleSubmit(event)}>
              <FormField
                id="venues-add-region-name"
                label="Region name"
                type="text"
                value={name}
                onChange={setName}
                required
                disabled={pending}
                autoComplete="off"
              />
              {error ? (
                <p className="team-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="team-modal__actions">
                <button
                  type="submit"
                  className="team-modal__save btn-icon-label"
                  data-testid="venues-add-region-save"
                  disabled={pending || !name.trim()}
                >
                  {pending ? null : <FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
                  {pending ? 'Saving…' : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
