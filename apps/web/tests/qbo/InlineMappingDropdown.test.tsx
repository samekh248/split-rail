import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineMappingDropdown } from '@/components/qbo/InlineMappingDropdown';

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/api/qbo', () => ({
  useCreateMapping: () => ({ mutateAsync, isPending: false }),
  qboKeys: { unmappedList: () => ['qbo', 'unmapped-list'] },
}));

vi.mock('@/api/ledger', () => ({
  ledgerKeys: { grid: () => ['ledger'] },
}));

describe('InlineMappingDropdown', () => {
  it('submits mapping for selected row', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InlineMappingDropdown
          venueId="ven-1"
          eventId="evt-1"
          transaction={{
            id: 'u-1',
            qboTransactionId: 'TXN-1',
            qboAccountId: 'ACC-1',
            qboAccountName: 'Sound',
            amount: '100.00',
            transactionDate: '2026-06-10',
            syncedAt: '2026-06-14T00:00:00Z',
          }}
          lineItemOptions={[{ id: 'row-1', label: 'Production' }]}
        />
      </QueryClientProvider>,
    );

    await user.selectOptions(screen.getByTestId('inline-mapping-select'), 'row-1');
    await user.click(screen.getByTestId('inline-mapping-confirm'));

    expect(mutateAsync).toHaveBeenCalledWith({
      qboAccountId: 'ACC-1',
      qboAccountName: 'Sound',
      mappedCategoryLabel: 'Production',
      mappedLineItemId: 'row-1',
    });
  });
});
