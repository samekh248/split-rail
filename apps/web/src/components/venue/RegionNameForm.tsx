export interface RegionNameFormProps {
  idPrefix: string;
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  fieldLabel?: string;
  pending?: boolean;
  error?: string | null;
  testId?: string;
}

export function RegionNameForm({
  idPrefix,
  name,
  onNameChange,
  onSubmit,
  onCancel,
  submitLabel,
  fieldLabel = 'Name',
  pending = false,
  error,
  testId,
}: RegionNameFormProps) {
  const fieldId = `${idPrefix}-name`;

  return (
    <form
      className="region-name-form"
      data-testid={testId}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="region-name-form__field">
        <label htmlFor={fieldId} className="region-name-form__label">
          {fieldLabel}
        </label>
        <input
          id={fieldId}
          className="form-field__input"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          disabled={pending}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="region-name-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="region-name-form__actions">
        {onCancel ? (
          <button type="button" className="btn-secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className="btn-primary--compact"
          disabled={pending || !name.trim()}
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
