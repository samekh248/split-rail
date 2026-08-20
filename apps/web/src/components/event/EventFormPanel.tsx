import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FormField } from '@/components/auth/FormField';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { validateEventForm, type EventFormValues } from '@/auth/validation';
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
}

const EMPTY_VALUES: EventFormValues = {
  title: '',
  eventDate: '',
  qboTagName: '',
};

export function EventFormPanel({
  mode,
  initialValues = EMPTY_VALUES,
  onSubmit,
  onCancel,
  isPending = false,
  onCreateFestival,
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
      <ModalHeader
        title={mode === 'create' ? (isFestival ? 'Create festival' : 'Create event') : 'Edit event'}
        titleId="event-form-panel-heading"
        onClose={onCancel}
        closeDisabled={isPending}
        titleClassName="event-form-panel__heading"
      />
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
