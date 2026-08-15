import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FormField } from '@/components/auth/FormField';
import { SelectField } from '@/components/auth/SelectField';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { useCreateFestival } from '@/api/festivals';
import { countFestivalDays, MAX_FESTIVAL_DAYS, validateFestivalRange } from '@/lib/festivalRange';
import type { VenueResponse } from '@/types/generated-api';

export { countFestivalDays, MAX_FESTIVAL_DAYS, validateFestivalRange };

export interface FestivalSetupModalProps {
  venueId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (eventId: string) => void;
  /** When set, converts this standard event into a festival instead of creating a new one. */
  existingEventId?: string;
  /** Pre-fills the name when converting an existing event. */
  initialTitle?: string;
  /** Pre-fills the start date when converting an existing event. */
  initialStartDate?: string;
  /** Offers a venue choice when the caller is not already scoped to one venue. */
  venues?: VenueResponse[];
}

function mapCreateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to manage the festival schedule.';
  }
  if (message.includes('400') || message.includes('409')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'Please check the festival details and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function FestivalSetupModal({
  venueId,
  open,
  onClose,
  onCreated,
  existingEventId,
  initialTitle = '',
  initialStartDate = '',
  venues,
}: FestivalSetupModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState(venueId);
  const createFestival = useCreateFestival(selectedVenueId);
  const showVenuePicker = !existingEventId && (venues?.length ?? 0) > 1;

  const [title, setTitle] = useState(initialTitle);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialStartDate);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [rangeError, setRangeError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedVenueId(venueId);
    setTitle(initialTitle);
    setStartDate(initialStartDate);
    setEndDate(initialStartDate);
    setTitleError(undefined);
    setRangeError(undefined);
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
  }, [open, onClose, initialTitle, initialStartDate, venueId]);

  if (!open) {
    return null;
  }

  const isPending = createFestival.isPending;
  const isConversion = Boolean(existingEventId);
  const dayCount = countFestivalDays(startDate, endDate);

  const handleSubmit = async () => {
    const nextTitleError = title.trim() ? undefined : 'Festival name is required.';
    const nextRangeError = validateFestivalRange(startDate, endDate);
    setTitleError(nextTitleError);
    setRangeError(nextRangeError);
    if (nextTitleError || nextRangeError) {
      return;
    }

    setSubmitError(null);
    try {
      const festival = await createFestival.mutateAsync({
        title: title.trim(),
        startDate,
        endDate,
        existingEventId: existingEventId ?? null,
      });
      onCreated(festival.eventId ?? '');
      onClose();
    } catch (error) {
      setSubmitError(mapCreateError(error));
    }
  };

  const errorId = submitError ? 'festival-setup-error' : undefined;

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal team-modal festival-setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="festival-setup-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        data-testid="festival-setup-modal"
      >
        <ModalHeader
          title={isConversion ? 'Convert to festival' : 'Create festival'}
          titleId="festival-setup-title"
          onClose={onClose}
          closeDisabled={isPending}
        />
        <p className="team-confirm__text">
          {isConversion
            ? 'Festival mode adds days, stages, and programming blocks. Your existing event and ledger are kept.'
            : 'A festival spans multiple days with one or more stages.'}
        </p>
        {submitError ? (
          <p id={errorId} className="team-modal__error" role="alert">
            {submitError}
          </p>
        ) : null}
        {showVenuePicker ? (
          <SelectField
            id="festival-venue"
            label="Venue"
            value={selectedVenueId}
            options={(venues ?? []).map((venue) => ({
              value: venue.id ?? '',
              label: venue.name ?? 'Unnamed venue',
            }))}
            onChange={setSelectedVenueId}
            disabled={isPending}
            data-testid="festival-venue-select"
          />
        ) : null}
        <FormField
          id="festival-title"
          label="Festival name"
          type="text"
          value={title}
          onChange={setTitle}
          onBlur={() => setTitleError(title.trim() ? undefined : 'Festival name is required.')}
          error={titleError}
          required
          disabled={isPending}
          describedBy={errorId}
        />
        <FormField
          id="festival-start-date"
          label="Start date"
          type="date"
          value={startDate}
          onChange={(value) => {
            setStartDate(value);
            if (!endDate || endDate < value) {
              setEndDate(value);
            }
          }}
          required
          disabled={isPending}
        />
        <FormField
          id="festival-end-date"
          label="End date"
          type="date"
          value={endDate}
          onChange={(value) => {
            setEndDate(value);
            setRangeError(validateFestivalRange(startDate, value));
          }}
          error={rangeError}
          required
          disabled={isPending}
        />
        {!rangeError && dayCount !== null && dayCount >= 1 ? (
          <p className="festival-setup-modal__day-count" data-testid="festival-day-count">
            {dayCount} {dayCount === 1 ? 'day' : 'days'}
          </p>
        ) : null}
        <div className="team-modal__actions">
          <button
            type="button"
            className="team-modal__save btn-icon-label"
            data-testid="festival-setup-save"
            onClick={() => void handleSubmit()}
            disabled={isPending}
          >
            <FontAwesomeIcon icon={faLayerGroup} aria-hidden="true" />
            {isPending ? 'Saving…' : isConversion ? 'Convert' : 'Create festival'}
          </button>
          <button
            type="button"
            className="team-modal__cancel"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
