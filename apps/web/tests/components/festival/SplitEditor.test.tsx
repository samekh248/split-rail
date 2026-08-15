import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SplitEditor } from '@/components/festival/SplitEditor';
import type { ExpenseSourceSummaryResponse } from '@/types/generated-api';

const summary: ExpenseSourceSummaryResponse = {
  sourceId: 'line-1',
  sourceKind: 'LEDGER_LINE',
  label: 'Production — Backline',
  sourceAmount: '10000.00',
  totalAllocated: '7500.00',
  remainingAtOverhead: '2500.00',
  allocations: [
    {
      id: 'split-1',
      targetType: 'BLOCK',
      method: 'FIXED_AMOUNT',
      calculatedAmount: '7500.00',
      countsTowardSettlement: true,
      createdAt: '2026-08-14T12:00:00Z',
    },
  ],
};

const previewTargets = [
  { id: 't1', label: 'Main Stage', amount: '3750.00' },
  { id: 't2', label: 'Rodeo Arena', amount: '3750.00' },
];

describe('SplitEditor', () => {
  it('renders method picker and existing split lines', () => {
    render(
      <SplitEditor
        summary={summary}
        method="EQUAL"
        onMethodChange={vi.fn()}
        previewTargets={previewTargets}
        canManage
      />,
    );

    expect(screen.getByTestId('split-method-select')).toHaveValue('EQUAL');
    expect(screen.getByTestId('split-line-split-1')).toBeInTheDocument();
  });

  it('shows multi-target expansion preview', async () => {
    render(
      <SplitEditor
        summary={summary}
        method="EQUAL"
        onMethodChange={vi.fn()}
        previewTargets={previewTargets}
        canManage
      />,
    );

    expect(screen.getByTestId('split-target-preview')).toBeInTheDocument();
    expect(screen.getByTestId('split-preview-t1')).toHaveTextContent('Main Stage');

    await userEvent.click(screen.getByRole('button', { name: /hide target preview/i }));
    expect(screen.queryByTestId('split-preview-t1')).not.toBeInTheDocument();
  });

  it('always shows overhead remainder', () => {
    render(
      <SplitEditor
        summary={summary}
        method="PERCENTAGE"
        onMethodChange={vi.fn()}
        previewTargets={[]}
        canManage
      />,
    );

    expect(screen.getByTestId('split-overhead-remainder')).toHaveTextContent('$2,500.00');
  });

  it('indicates when preview reconciles to the source amount', () => {
    render(
      <SplitEditor
        summary={summary}
        method="EQUAL"
        onMethodChange={vi.fn()}
        previewTargets={previewTargets}
        canManage
      />,
    );

    expect(screen.getByTestId('split-reconcile-indicator')).toHaveTextContent('reconciles');
  });

  it('fires method change from the picker', async () => {
    const onMethodChange = vi.fn();
    render(
      <SplitEditor
        summary={summary}
        method="EQUAL"
        onMethodChange={onMethodChange}
        previewTargets={[]}
        canManage
      />,
    );

    await userEvent.selectOptions(screen.getByTestId('split-method-select'), 'MANUAL_LINE');
    expect(onMethodChange).toHaveBeenCalledWith('MANUAL_LINE');
  });
});
