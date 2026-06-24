import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnmappedBanner } from '@/components/qbo/UnmappedBanner';

vi.mock('@/api/qbo', () => ({
  useUnmappedCount: vi.fn(),
  useUnmappedTransactions: vi.fn(),
  qboKeys: { unmappedList: () => ['qbo', 'unmapped-list'] },
}));

vi.mock('@/components/qbo/InlineMappingDropdown', () => ({
  InlineMappingDropdown: () => <div data-testid="inline-mapping-dropdown" />,
}));

import { useUnmappedCount, useUnmappedTransactions } from '@/api/qbo';

const mockedCount = vi.mocked(useUnmappedCount);
const mockedList = vi.mocked(useUnmappedTransactions);

describe('UnmappedBanner', () => {
  beforeEach(() => {
    mockedCount.mockReturnValue({
      data: { eventId: 'evt-1', unmappedCount: 2 },
    } as ReturnType<typeof useUnmappedCount>);
    mockedList.mockReturnValue({
      data: {
        eventId: 'evt-1',
        venueId: 'ven-1',
        unmappedCount: 2,
        transactions: [
          {
            id: 'u-1',
            qboTransactionId: 'TXN-1',
            qboAccountId: 'ACC-1',
            qboAccountName: 'Sound',
            amount: '100.00',
            transactionDate: '2026-06-10',
            syncedAt: '2026-06-14T00:00:00Z',
          },
        ],
      },
    } as ReturnType<typeof useUnmappedTransactions>);
  });

  it('shows unmapped count', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UnmappedBanner venueId="ven-1" eventId="evt-1" lineItemOptions={[]} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('unmapped-banner')).toHaveTextContent(
      '2 unassigned transactions detected',
    );
    expect(screen.getByTestId('unmapped-banner-badge')).toHaveClass('badge-action-required');
  });

  it('expands list on toggle', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UnmappedBanner venueId="ven-1" eventId="evt-1" lineItemOptions={[]} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('unmapped-banner-toggle'));
    expect(screen.getByTestId('unmapped-list')).toBeInTheDocument();
  });
});
