import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FormField } from '@/components/auth/FormField';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { validateVenueName } from '@/auth/validation';
import { useCreateVenue } from '@/api/venues';

export interface AddVenueModalProps {
  regionId: string;
  regionName: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function mapCreateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to add venues.';
  }
  if (message.includes('400')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'Please check the venue name and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function AddVenueModal({ regionId, regionName, open, onClose, onCreated }: AddVenueModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const createVenue = useCreateVenue();
  const [venueName, setVenueName] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setVenueName('');
    setFieldError(undefined);
    setSubmitError(null);

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isPending = createVenue.isPending;

  const handleSubmit = async () => {
    const validationError = validateVenueName(venueName);
    setFieldError(validationError);
    if (validationError) {
      return;
    }

    setSubmitError(null);
    try {
      await createVenue.mutateAsync({ name: venueName.trim(), regionId });
      onCreated();
      onClose();
    } catch (error) {
      setSubmitError(mapCreateError(error));
    }
  };

  const errorId = submitError ? 'venue-add-error' : undefined;

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal team-modal venue-modal-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-add-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        data-testid="venue-add-modal"
      >
        <ModalHeader
          title="Add venue"
          titleId="venue-add-title"
          onClose={onClose}
          closeDisabled={isPending}
        />
        <p className="team-confirm__text">Add a venue to {regionName}.</p>
        {submitError ? (
          <p id={errorId} className="team-modal__error" role="alert">
            {submitError}
          </p>
        ) : null}
        <FormField
          id="venue-add-name"
          label="Venue name"
          type="text"
          value={venueName}
          onChange={setVenueName}
          onBlur={() => setFieldError(validateVenueName(venueName))}
          error={fieldError}
          required
          autoComplete="organization"
          disabled={isPending}
          describedBy={errorId}
        />
        <div className="team-modal__actions">
          <button
            type="button"
            className="team-modal__save btn-icon-label"
            data-testid="venue-add-save"
            onClick={() => void handleSubmit()}
            disabled={isPending}
          >
            {isPending ? null : <FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
            {isPending ? 'Creating venue…' : 'Create venue'}
          </button>
        </div>
      </div>
    </div>
  );
}
