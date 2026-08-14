import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FestivalLedgerPage } from '@/pages/FestivalLedgerPage';

const resolveMock = vi.fn().mockResolvedValue({});

vi.mock('@/api/festivalFinancials', () => ({
  useRevenueBuckets: () => ({
    data: [
      {
        id: 'bucket-1',
        name: 'Tickets',
        amount: '10000.00',
        totalAllocated: '2000.00',
        remaining: '8000.00',
        isAllocable: true,
      },
    ],
    isLoading: false,
  }),
  useBucketAllocations: () => ({ data: [], isLoading: false }),
  useExpenseSourceSummary: () => ({ data: { sourceTotal: 1000, allocated: 900, remainder: 100 } }),
  useUpdateRevenueBucket: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/api/festivalQbo', () => ({
  useFestivalQboTransactions: () => ({
    data: [
      {
        id: 'tx-1',
        qboTransactionId: 'QBO-123',
        amount: 500,
        reviewState: 'UNTAGGED',
      },
    ],
    refetch: vi.fn(),
  }),
  useResolveQboReview: () => ({ mutateAsync: resolveMock, isPending: false }),
}));

vi.mock('@/lib/eventWorkspaceRoute', () => ({
  navigateToEventWorkspace: vi.fn(),
}));

function renderPage(props: Partial<React.ComponentProps<typeof FestivalLedgerPage>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FestivalLedgerPage
        venueId="venue-1"
        eventId="event-1"
        sourceLineItemId="line-1"
        canManage
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('FestivalLedgerPage', () => {
  it('renders buckets, allocations, splits, and QBO inbox', () => {
    renderPage();

    expect(screen.getByTestId('festival-ledger-page')).toBeInTheDocument();
    expect(screen.getByTestId('bucket-table')).toBeInTheDocument();
    expect(screen.getByTestId('allocation-editor')).toBeInTheDocument();
    expect(screen.getByTestId('split-editor')).toBeInTheDocument();
    expect(screen.getByTestId('festival-qbo-inbox')).toBeInTheDocument();
    expect(screen.getByText(/QBO-123/)).toBeInTheDocument();
  });

  it('filters the exception queue', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('festival-qbo-exception-filter'));
    expect(screen.getByTestId('festival-qbo-exception-filter')).toBeChecked();
  });

  it('opens the mapping drawer and resolves a review', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /QBO-123/i }));
    expect(screen.getByTestId('transaction-mapping-drawer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Accept as overhead/i }));
    await waitFor(() => expect(resolveMock).toHaveBeenCalled());
  });
});
