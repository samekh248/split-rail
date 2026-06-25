import { useState } from 'react';
import { parseMoneyInput } from '@/lib/money';
import type { CreateLineItemRequest } from '@/types/generated-api';

export interface AddLineItemFormValues {
  rowLabel: string;
  value: string;
  isArtistDeduction: boolean;
}

interface AddLineItemFormProps {
  blockType: 'REVENUE' | 'EXPENSES';
  isBudgetLocked: boolean;
  sortOrder: number;
  onSubmit: (request: CreateLineItemRequest) => Promise<void>;
  onCancel: () => void;
}

export function AddLineItemForm({
  blockType,
  isBudgetLocked,
  sortOrder,
  onSubmit,
  onCancel,
}: AddLineItemFormProps) {
  const [rowLabel, setRowLabel] = useState('');
  const [value, setValue] = useState('0.00');
  const [isArtistDeduction, setIsArtistDeduction] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valueLabel = isBudgetLocked ? 'Settlement value' : 'Proforma value';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLabelError(null);
    setValueError(null);

    const trimmedLabel = rowLabel.trim();
    if (!trimmedLabel) {
      setLabelError('Label is required');
      return;
    }

    const parsedValue = parseMoneyInput(value);
    if (parsedValue === null) {
      setValueError('Enter a valid monetary value');
      return;
    }

    if (isBudgetLocked && parsedValue === '0.00') {
      setValueError('Settlement value is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        blockType,
        rowLabel: trimmedLabel,
        sortOrder,
        isArtistDeduction: blockType === 'EXPENSES' ? isArtistDeduction : false,
        proformaValue: isBudgetLocked ? '0.00' : parsedValue,
        settlementValue: isBudgetLocked ? parsedValue : '0.00',
        notes: '',
        isHiddenFromPromoter: false,
      });
      setRowLabel('');
      setValue('0.00');
      setIsArtistDeduction(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="add-line-item-form"
      data-testid="add-line-item-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="add-line-item-form__field">
        <label className="form-field__label" htmlFor={`add-label-${blockType}`}>
          Label
        </label>
        <input
          id={`add-label-${blockType}`}
          type="text"
          className="form-field__input"
          value={rowLabel}
          onChange={(event) => setRowLabel(event.target.value)}
          data-testid="add-line-item-label"
        />
        {labelError && (
          <span className="add-line-item-form__error" role="alert">
            {labelError}
          </span>
        )}
      </div>

      {isBudgetLocked ? (
        <div className="add-line-item-form__field">
          <span>Proforma</span>
          <span data-testid="add-line-item-proforma-readonly">0.00</span>
        </div>
      ) : null}

      <div className="add-line-item-form__field">
        <label className="form-field__label" htmlFor={`add-value-${blockType}`}>
          {valueLabel}
        </label>
        <input
          id={`add-value-${blockType}`}
          type="text"
          className="form-field__input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          data-testid={isBudgetLocked ? 'add-line-item-settlement' : 'add-line-item-proforma'}
        />
        {valueError && (
          <span className="add-line-item-form__error" role="alert">
            {valueError}
          </span>
        )}
      </div>

      {blockType === 'EXPENSES' && (
        <label className="add-line-item-form__checkbox">
          <input
            type="checkbox"
            checked={isArtistDeduction}
            onChange={(event) => setIsArtistDeduction(event.target.checked)}
            data-testid="add-line-item-deduction"
          />
          Artist deduction
        </label>
      )}

      <div className="add-line-item-form__actions">
        <button type="submit" disabled={submitting} data-testid="add-line-item-submit">
          {submitting ? 'Saving…' : 'Save row'}
        </button>
        <button type="button" onClick={onCancel} data-testid="add-line-item-cancel">
          Cancel
        </button>
      </div>
    </form>
  );
}
