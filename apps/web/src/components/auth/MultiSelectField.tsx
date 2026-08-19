import { useEffect, useId, useRef, useState } from 'react';
import type { SelectOption } from '@/components/auth/SelectField';

export interface MultiSelectFieldProps {
  id: string;
  label?: string;
  ariaLabel?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  wrapperClassName?: string;
  labelClassName?: string;
  'data-testid'?: string;
}

export function formatMultiSelectLabel(
  values: string[],
  options: SelectOption[],
  placeholder = 'All',
): string {
  if (values.length === 0) {
    return placeholder;
  }

  const labels = values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return placeholder;
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]}, ${labels[1]}`;
  }
  return `${labels[0]} + ${labels.length - 1} more`;
}

export function MultiSelectField({
  id,
  label,
  ariaLabel,
  values,
  onChange,
  options,
  placeholder = 'All',
  disabled,
  wrapperClassName = 'form-field',
  labelClassName = 'form-field__label',
  'data-testid': dataTestId,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const displayLabel = formatMultiSelectLabel(values, options, placeholder);
  const allSelected = options.length > 0 && values.length === options.length;

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

  const toggleValue = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
    );
  };

  const selectAll = () => {
    onChange(options.filter((option) => !option.disabled).map((option) => option.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (open && event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div
        className={['select-field', 'multi-select-field', open ? 'select-field--open' : '']
          .filter(Boolean)
          .join(' ')}
        ref={containerRef}
      >
        <button
          id={id}
          type="button"
          className="select-field__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={label ? undefined : ariaLabel}
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
              values.length === 0
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
          <div className="multi-select-field__panel">
            <div className="multi-select-field__actions">
              <button
                type="button"
                className="multi-select-field__action"
                data-testid={dataTestId ? `${dataTestId}-select-all` : undefined}
                onClick={selectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="multi-select-field__action"
                data-testid={dataTestId ? `${dataTestId}-clear` : undefined}
                onClick={clearAll}
              >
                Clear
              </button>
            </div>
            <ul
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-label={label ?? ariaLabel}
              className="multi-select-field__list"
              data-testid={dataTestId ? `${dataTestId}-list` : undefined}
            >
              {options.map((option) => {
                const isSelected = values.includes(option.value);
                const optionTestId = dataTestId ? `${dataTestId}-option-${option.value}` : undefined;

                return (
                  <li key={option.value} role="presentation">
                    <label
                      className={[
                        'multi-select-field__option',
                        isSelected ? 'multi-select-field__option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-testid={optionTestId}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={option.disabled}
                        onChange={() => toggleValue(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {allSelected ? (
              <p className="multi-select-field__hint">All stages selected</p>
            ) : values.length === 0 ? (
              <p className="multi-select-field__hint">Showing every stage</p>
            ) : (
              <p className="multi-select-field__hint">
                {values.length} of {options.length} stages selected
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
