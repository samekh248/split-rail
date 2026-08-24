import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FormField } from '@/components/auth/FormField';
import { validateEventForm, type EventFormValues } from '@/auth/validation';
import type { BookingPlacementStatus } from '@/lib/bookingCalendar';
import {
  countFestivalDays,
  MAX_FESTIVAL_DAYS,
  validateFestivalRange,
} from '@/lib/festivalRange';

export type EventCreationType = 'standard' | 'festival';

export interface FestivalFormValues {
  title: string;
  startDate: string;
  endDate: string;
}

export interface EventFormPanelProps {
  mode: 'create' | 'edit';
  initialValues?: EventFormValues;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  /** When provided, create mode offers a festival alongside the standard single-day event. */
  onCreateFestival?: (values: FestivalFormValues) => Promise<void>;
  /** Gates show start time in edit mode (confirmed placements only). */
  bookingPlacementStatus?: BookingPlacementStatus | string | null;
}

const EMPTY_VALUES: EventFormValues = {
  title: '',
  eventDate: '',
  qboTagName: '',
  doorsTime: '',
  showStartTime: '',
  supportLineup: '',
  notes: '',
};

function TextAreaField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label}
      </label>
      <textarea
        id={id}
        className="form-field__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EventFormPanel({
  mode,
  initialValues = EMPTY_VALUES,
  onSubmit,
  onCancel,
  isPending = false,
  onCreateFestival,
  bookingPlacementStatus = null,
}: EventFormPanelProps) {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [endDate, setEndDate] = useState('');
  const [creationType, setCreationType] = useState<EventCreationType>('standard');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [rangeError, setRangeError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const offerFestival = mode === 'create' && Boolean(onCreateFestival);
  const isFestival = offerFestival && creationType === 'festival';
  const dayCount = isFestival ? countFestivalDays(values.eventDate, endDate) : null;

  const handleTypeChange = (nextType: EventCreationType) => {
    setCreationType(nextType);
    setFieldErrors({});
    setRangeError(undefined);
    setSubmitError(null);
  };

  const submitFestival = async () => {
    const titleError = values.title.trim() ? undefined : 'Festival name is required.';
    const startError = values.eventDate ? undefined : 'Start date is required.';
    const nextRangeError = startError
      ? undefined
      : validateFestivalRange(values.eventDate, endDate);

    setFieldErrors({ title: titleError, eventDate: startError });
    setRangeError(nextRangeError);
    if (titleError || startError || nextRangeError) {
      return;
    }

    await onCreateFestival?.({
      title: values.title.trim(),
      startDate: values.eventDate,
      endDate,
    });
  };

  const submitStandardEvent = async () => {
    const errors = validateEventForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    await onSubmit({
      title: values.title.trim(),
      eventDate: values.eventDate,
      qboTagName: values.qboTagName.trim(),
      doorsTime: values.doorsTime ?? '',
      showStartTime: values.showStartTime ?? '',
      supportLineup: values.supportLineup ?? '',
      notes: values.notes ?? '',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      if (isFestival) {
        await submitFestival();
      } else {
        await submitStandardEvent();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSubmitError(message.replace(/^\d+:\s*/, '') || 'Something went wrong. Please try again.');
    }
  };

  const submitLabel = isFestival
    ? 'Create festival'
    : mode === 'create'
      ? 'Create event'
      : 'Save changes';

  return (
    <section
      className="event-form-panel"
      aria-labelledby="event-form-panel-heading"
      data-testid="event-form-panel"
    >
      <header className="event-form-panel__header section-header">
        <h2 id="event-form-panel-heading" className="event-form-panel__heading">
          {mode === 'create' ? (isFestival ? 'Create festival' : 'Create event') : 'Edit event'}
        </h2>
      </header>
      <form className="event-form-panel__form" onSubmit={(event) => void handleSubmit(event)}>
        {offerFestival ? (
          <fieldset className="event-form-panel__type" data-testid="event-type-picker">
            <legend className="event-form-panel__type-legend">Event type</legend>
            <label
              className={`event-form-panel__type-option${creationType === 'standard' ? ' event-form-panel__type-option--active' : ''}`}
            >
              <input
                type="radio"
                name="event-creation-type"
                value="standard"
                checked={creationType === 'standard'}
                onChange={() => handleTypeChange('standard')}
                disabled={isPending}
                data-testid="event-type-standard"
              />
              <span className="event-form-panel__type-copy">
                <span className="event-form-panel__type-title">Standard event</span>
                <span className="event-form-panel__type-hint">
                  A single date with one lineup and one settlement.
                </span>
              </span>
            </label>
            <label
              className={`event-form-panel__type-option${creationType === 'festival' ? ' event-form-panel__type-option--active' : ''}`}
            >
              <input
                type="radio"
                name="event-creation-type"
                value="festival"
                checked={creationType === 'festival'}
                onChange={() => handleTypeChange('festival')}
                disabled={isPending}
                data-testid="event-type-festival"
              />
              <span className="event-form-panel__type-copy">
                <span className="event-form-panel__type-title">Festival</span>
                <span className="event-form-panel__type-hint">
                  Up to {MAX_FESTIVAL_DAYS} days with stages, programming blocks, and per-block
                  settlements.
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}
        <div className="event-form-panel__row">
          <FormField
            id="event-title"
            label={isFestival ? 'Festival name' : 'Event title'}
            type="text"
            value={values.title}
            onChange={(value) => setValues((current) => ({ ...current, title: value }))}
            error={fieldErrors.title}
            disabled={isPending}
          />
          <FormField
            id="event-date"
            label={isFestival ? 'Start date' : 'Event date'}
            type="date"
            value={values.eventDate}
            onChange={(value) => {
              setValues((current) => ({ ...current, eventDate: value }));
              if (isFestival) {
                const nextEnd = !endDate || endDate < value ? value : endDate;
                setEndDate(nextEnd);
                setRangeError(validateFestivalRange(value, nextEnd));
              }
            }}
            error={fieldErrors.eventDate}
            disabled={isPending}
          />
        </div>
        {isFestival ? (
          <>
            <FormField
              id="event-end-date"
              label="End date"
              type="date"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                setRangeError(validateFestivalRange(values.eventDate, value));
              }}
              error={rangeError}
              disabled={isPending}
            />
            {!rangeError && dayCount !== null && dayCount >= 1 ? (
              <p className="event-form-panel__day-count" data-testid="event-festival-day-count">
                {dayCount} {dayCount === 1 ? 'day' : 'days'}
              </p>
            ) : null}
            <p className="event-form-panel__hint">
              Days and a first stage are created for you, and the accounting tag is generated from
              the festival name.
            </p>
          </>
        ) : (
          <FormField
            id="event-qbo-tag"
            label="Accounting tag (optional)"
            type="text"
            value={values.qboTagName}
            onChange={(value) => setValues((current) => ({ ...current, qboTagName: value }))}
            disabled={isPending}
          />
        )}
        {mode === 'edit' && !isFestival ? (
          <div className="event-form-panel__show-details">
            <div className="event-form-panel__group">
              <h3 className="event-form-panel__group-heading">Schedule</h3>
              <div className="event-form-panel__group-body event-form-panel__schedule">
                <FormField
                  id="event-doors-time"
                  label="Doors time"
                  type="time"
                  value={values.doorsTime ?? ''}
                  onChange={(value) => setValues((current) => ({ ...current, doorsTime: value }))}
                  disabled={isPending}
                />
                {bookingPlacementStatus === 'CONFIRMED' ? (
                  <FormField
                    id="event-show-start-time"
                    label="Show start time"
                    type="time"
                    value={values.showStartTime ?? ''}
                    onChange={(value) =>
                      setValues((current) => ({ ...current, showStartTime: value }))
                    }
                    disabled={isPending}
                  />
                ) : null}
              </div>
            </div>
            <TextAreaField
              id="event-support-lineup"
              label="Supporting lineup"
              value={values.supportLineup ?? ''}
              onChange={(value) => setValues((current) => ({ ...current, supportLineup: value }))}
              disabled={isPending}
            />
            <TextAreaField
              id="event-notes"
              label="Notes"
              value={values.notes ?? ''}
              onChange={(value) => setValues((current) => ({ ...current, notes: value }))}
              error={fieldErrors.notes}
              disabled={isPending}
            />
          </div>
        ) : null}
        {submitError ? (
          <p className="event-form-panel__error" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="event-form-panel__actions">
          <button
            type="button"
            className="event-form-panel__cancel"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="event-form-panel__submit btn-icon-label"
            disabled={isPending}
          >
            <FontAwesomeIcon icon={mode === 'edit' ? faFloppyDisk : faPlus} aria-hidden="true" />
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
