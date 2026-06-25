import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pickSelectFieldOption } from '../utils/selectField';
import { dashboardQueryKey } from '@/api/dashboard';
import { InlineMappingDropdown } from '@/components/qbo/InlineMappingDropdown';

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/api/qbo', () => ({
  useCreateMapping: () => ({ mutateAsync, isPending: false }),
  qboKeys: { unmappedList: () => ['qbo', 'unmapped-list'] },
}));

vi.mock('@/api/ledger', () => ({
  ledgerKeys: { grid: () => ['ledger'] },
}));

vi.mock('@/api/dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/dashboard')>();
  return {
    ...actual,
    dashboardQueryKey: actual.dashboardQueryKey,
  };
});

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

    await pickSelectFieldOption(user, 'inline-mapping-select', 'row-1');
    await user.click(screen.getByTestId('inline-mapping-confirm'));

    expect(mutateAsync).toHaveBeenCalledWith({
      qboAccountId: 'ACC-1',
      qboAccountName: 'Sound',
      mappedCategoryLabel: 'Production',
      mappedLineItemId: 'row-1',
    });
  });

  it('invalidates dashboard query after successful mapping', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <QueryClientProvider client={queryClient}>
        <InlineMappingDropdown
          venueId="ven-1"
          eventId="evt-1"
          transaction={{
            id: 'u-1',
            qboAccountId: 'ACC-1',
            qboAccountName: 'Sound',
            amount: '100.00',
            transactionDate: '2026-06-10',
          }}
          lineItemOptions={[{ id: 'row-1', label: 'Production' }]}
        />
      </QueryClientProvider>,
    );

    await pickSelectFieldOption(user, 'inline-mapping-select', 'row-1');
    await user.click(screen.getByTestId('inline-mapping-confirm'));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardQueryKey('ven-1') });
  });
});
