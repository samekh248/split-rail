import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionMappingDrawer } from '@/components/festival/TransactionMappingDrawer';

const transaction = {
  id: 'tx-1',
  qboTransactionId: 'TXN-42',
  qboAccountId: 'acct-1',
  qboAccountName: 'Production',
  amount: '900.00',
  transactionDate: '2026-08-14',
  reviewState: 'MISMATCHED_TAG',
  masterTag: '#Fest-2026-TEST',
  totalAllocated: '400.00',
  remainingAtOverhead: '500.00',
  allocationState: 'Partial',
  allocations: [
    {
      allocationId: 'alloc-1',
      targetType: 'BLOCK',
      amount: '400.00',
      countsTowardSettlement: true,
      createdByUserId: 'user-1',
      createdAt: '2026-08-14T12:00:00Z',
    },
  ],
};

describe('TransactionMappingDrawer', () => {
  it('renders review-state chips and side-by-side mapping', () => {
    render(
      <TransactionMappingDrawer open transaction={transaction} onClose={vi.fn()} canManage />,
    );

    expect(screen.getByTestId('qbo-review-chip')).toHaveTextContent('Review required');
    expect(screen.getByTestId('qbo-mapping-compare')).toBeInTheDocument();
    expect(screen.getByTestId('qbo-remaining-overhead')).toHaveTextContent('500');
  });

  it('blocks settlement-marked splits on exception rows', () => {
    render(
      <TransactionMappingDrawer open transaction={transaction} onClose={vi.fn()} canManage />,
    );

    expect(screen.getByTestId('qbo-settlement-blocked')).toBeInTheDocument();
  });

  it('calls onResolve for review resolution', () => {
    const onResolve = vi.fn();
    render(
      <TransactionMappingDrawer
        open
        transaction={transaction}
        onClose={vi.fn()}
        canManage
        onResolve={onResolve}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /accept as overhead/i }));
    expect(onResolve).toHaveBeenCalledWith('AcceptAsOverhead', 'Accepted as festival overhead');
  });
});
