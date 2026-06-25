export interface FormFieldProps {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text' | 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  describedBy?: string;
}

export function FormField({
  id,
  label,
  type,
  value,
  onChange,
  onBlur,
  error,
  required,
  autoComplete,
  disabled,
  describedBy,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const describedByIds = [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label}
      </label>
      <input
        id={id}
        className="form-field__input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds}
        aria-required={required ? true : undefined}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
