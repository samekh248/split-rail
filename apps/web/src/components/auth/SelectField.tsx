export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  id: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  'data-testid'?: string;
}

export function SelectField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  error,
  className = 'form-field__input',
  wrapperClassName = 'form-field',
  labelClassName = 'form-field__label',
  'data-testid': dataTestId,
}: SelectFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <select
        id={id}
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-required={required ? true : undefined}
        disabled={disabled}
        required={required}
        data-testid={dataTestId}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
