import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddLineItemForm } from '@/components/ledger/AddLineItemForm';

describe('AddLineItemForm', () => {
  it('requires label in planning mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddLineItemForm
        blockType="REVENUE"
        isBudgetLocked={false}
        sortOrder={1}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.click(screen.getByTestId('add-line-item-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Label is required');
  });

  it('submits proforma value when budget is unlocked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddLineItemForm
        blockType="REVENUE"
        isBudgetLocked={false}
        sortOrder={2}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.type(screen.getByTestId('add-line-item-label'), 'VIP tier');
    await user.clear(screen.getByTestId('add-line-item-proforma'));
    await user.type(screen.getByTestId('add-line-item-proforma'), '1500.00');
    await user.click(screen.getByTestId('add-line-item-submit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        blockType: 'REVENUE',
        rowLabel: 'VIP tier',
        sortOrder: 2,
        proformaValue: '1500.00',
        settlementValue: '0.00',
      }),
    );
  });

  it('requires settlement value when budget is locked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddLineItemForm
        blockType="EXPENSES"
        isBudgetLocked
        sortOrder={3}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.type(screen.getByTestId('add-line-item-label'), 'Late rental');
    await user.click(screen.getByTestId('add-line-item-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Settlement value is required');
    expect(screen.getByTestId('add-line-item-proforma-readonly')).toHaveTextContent('0.00');
  });

  it('submits settlement value when budget is locked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddLineItemForm
        blockType="EXPENSES"
        isBudgetLocked
        sortOrder={4}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.type(screen.getByTestId('add-line-item-label'), 'Surprise catering');
    await user.clear(screen.getByTestId('add-line-item-settlement'));
    await user.type(screen.getByTestId('add-line-item-settlement'), '400.00');
    await user.click(screen.getByTestId('add-line-item-submit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        blockType: 'EXPENSES',
        rowLabel: 'Surprise catering',
        proformaValue: '0.00',
        settlementValue: '400.00',
      }),
    );
  });

  it('submits isArtistDeduction when add-row deduction checkbox is checked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddLineItemForm
        blockType="EXPENSES"
        isBudgetLocked={false}
        sortOrder={5}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.type(screen.getByTestId('add-line-item-label'), 'Marketing');
    await user.clear(screen.getByTestId('add-line-item-proforma'));
    await user.type(screen.getByTestId('add-line-item-proforma'), '500.00');
    await user.click(screen.getByTestId('add-line-item-deduction'));
    await user.click(screen.getByTestId('add-line-item-submit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        blockType: 'EXPENSES',
        isArtistDeduction: true,
        proformaValue: '500.00',
      }),
    );
  });
});
