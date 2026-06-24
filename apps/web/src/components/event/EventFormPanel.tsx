import { useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { validateEventForm, type EventFormValues } from '@/auth/validation';

export interface EventFormPanelProps {
  mode: 'create' | 'edit';
  initialValues?: EventFormValues;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
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
}: EventFormPanelProps) {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateEventForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitError(null);
    try {
      await onSubmit({
        title: values.title.trim(),
        eventDate: values.eventDate,
        qboTagName: values.qboTagName.trim(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSubmitError(message.replace(/^\d+:\s*/, '') || 'Something went wrong. Please try again.');
    }
  };

  return (
    <section
      className="event-form-panel"
      aria-labelledby="event-form-panel-heading"
      data-testid="event-form-panel"
    >
      <h2 id="event-form-panel-heading" className="event-form-panel__heading">
        {mode === 'create' ? 'Create event' : 'Edit event'}
      </h2>
      <form className="event-form-panel__form" onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          id="event-title"
          label="Event title"
          type="text"
          value={values.title}
          onChange={(value) => setValues((current) => ({ ...current, title: value }))}
          error={fieldErrors.title}
          disabled={isPending}
        />
        <FormField
          id="event-date"
          label="Event date"
          type="date"
          value={values.eventDate}
          onChange={(value) => setValues((current) => ({ ...current, eventDate: value }))}
          error={fieldErrors.eventDate}
          disabled={isPending}
        />
        <FormField
          id="event-qbo-tag"
          label="Accounting tag (optional)"
          type="text"
          value={values.qboTagName}
          onChange={(value) => setValues((current) => ({ ...current, qboTagName: value }))}
          disabled={isPending}
        />
        {submitError ? (
          <p className="event-form-panel__error" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="event-form-panel__actions">
          <button type="button" className="event-form-panel__cancel" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" className="event-form-panel__submit" disabled={isPending}>
            {mode === 'create' ? 'Create event' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
