import { useEffect, useRef, useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { validateVenueName } from '@/auth/validation';
import { useUpdateVenue } from '@/api/venues';
import { useRegions } from '@/api/regions';
import type { VenueResponse } from '@/types/generated-api';

export interface VenueEditModalProps {
  venue: VenueResponse;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function mapUpdateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to update this venue.';
  }
  if (message.includes('404')) {
    return 'Venue not found.';
  }
  if (message.includes('400')) {
    return message.replace(/^\d+:\s*/, '') || 'Please check the venue name and try again.';
  }
  return 'Unable to save changes. Please try again.';
}

export function VenueEditModal({ venue, open, onClose, onSaved }: VenueEditModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const updateVenue = useUpdateVenue(venue.id ?? '');
  const { data: regions = [] } = useRegions();
  const [name, setName] = useState(venue.name ?? '');
  const [regionId, setRegionId] = useState(venue.regionId ?? '');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(venue.name ?? '');
    setRegionId(venue.regionId ?? '');
    setFieldError(undefined);
    setError(null);
  }, [venue, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

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

  const handleSave = async () => {
    const validationError = validateVenueName(name);
    setFieldError(validationError);
    if (validationError) {
      return;
    }

    setError(null);
    try {
      await updateVenue.mutateAsync({
        name: name.trim(),
        regionId: regionId || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(mapUpdateError(err));
    }
  };

  const isPending = updateVenue.isPending;

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-edit-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        data-testid="venue-edit-modal"
      >
        <h2 id="venue-edit-title" className="welcome-modal__title">
          Edit venue
        </h2>
        {error ? (
          <p className="team-modal__error" role="alert">
            {error}
          </p>
        ) : null}
        <FormField
          id="venue-edit-name"
          label="Venue name"
          type="text"
          value={name}
          onChange={setName}
          onBlur={() => setFieldError(validateVenueName(name))}
          error={fieldError}
          required
          disabled={isPending}
        />
        {regions.length > 0 ? (
          <label htmlFor="venue-edit-region">
            Region
            <select
              id="venue-edit-region"
              data-testid="venue-region-field"
              value={regionId}
              onChange={(event) => setRegionId(event.target.value)}
              required
            >
              <option value="">Select region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id ?? ''}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="team-modal__actions">
          <button type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="team-modal__save"
            data-testid="venue-edit-save"
            onClick={() => void handleSave()}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
