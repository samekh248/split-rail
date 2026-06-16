export interface FormFieldProps {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
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
}: FormFieldProps) {
  const errorId = `${id}-error`;

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
        aria-describedby={error ? errorId : undefined}
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
