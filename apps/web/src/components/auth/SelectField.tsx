import { useEffect, useId, useRef, useState } from 'react';

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
  className = '',
  wrapperClassName = 'form-field',
  labelClassName = 'form-field__label',
  'data-testid': dataTestId,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const errorId = `${id}-error`;

  const selectedOption = options.find((option) => option.value === value) ?? null;
  const displayLabel =
    selectedOption?.label ?? (value === '' && placeholder ? placeholder : 'Select…');

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    setHighlightIndex(index >= 0 ? index : 0);
  }, [options, value, open]);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    const selectableOptions = options.filter((option) => !option.disabled);

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (selectableOptions.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[highlightIndex];
      if (option && !option.disabled) {
        selectValue(option.value);
      }
    }
  };

  const fieldClassName = [
    'select-field',
    open ? 'select-field--open' : '',
    error ? 'select-field--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div className={fieldClassName} ref={containerRef}>
        <button
          id={id}
          type="button"
          className="select-field__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={required ? true : undefined}
          disabled={disabled}
          data-testid={dataTestId}
          onClick={() => {
            if (!disabled) {
              setOpen((current) => !current);
            }
          }}
          onKeyDown={handleKeyDown}
        >
          <span
            className={
              !selectedOption && value === '' && placeholder
                ? 'select-field__value select-field__value--placeholder'
                : 'select-field__value'
            }
          >
            {displayLabel}
          </span>
          <span className="select-field__chevron" aria-hidden="true">
            ▾
          </span>
        </button>
        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label ?? ariaLabel}
            className="select-field__list"
            data-testid={dataTestId ? `${dataTestId}-list` : undefined}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightIndex;
              const optionTestId = dataTestId ? `${dataTestId}-option-${option.value}` : undefined;

              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={[
                      'select-field__option',
                      isSelected ? 'select-field__option--selected' : '',
                      isHighlighted ? 'select-field__option--highlighted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    data-testid={optionTestId}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => {
                      if (!option.disabled) {
                        selectValue(option.value);
                      }
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
