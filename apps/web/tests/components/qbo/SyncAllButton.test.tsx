import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SyncAllButton } from '@/components/qbo/SyncAllButton';

const mutateAsync = vi.fn();

vi.mock('@/api/user', () => ({
  useCanTriggerQboSync: vi.fn(),
}));

vi.mock('@/api/qbo', () => ({
  useVenueSync: () => ({ mutateAsync, isPending: false }),
  qboKeys: {
    venueStatus: () => ['qbo', 'venue-status'],
    all: ['qbo'],
  },
}));

vi.mock('@/api/dashboard', () => ({
  dashboardQueryKey: () => ['dashboard'],
}));

import { useCanTriggerQboSync } from '@/api/user';

describe('SyncAllButton', () => {
  it('is hidden without permission', () => {
    vi.mocked(useCanTriggerQboSync).mockReturnValue(false);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncAllButton venueId="ven-1" />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('sync-all-button')).not.toBeInTheDocument();
  });

  it('triggers venue sync when clicked', async () => {
    mutateAsync.mockResolvedValue({
      venueId: 'ven-1',
      attemptedCount: 1,
      succeededCount: 1,
      results: [{ eventId: 'evt-1', title: 'Show A', success: true, errorMessage: null }],
    });
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncAllButton venueId="ven-1" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('sync-all-button'));
    expect(mutateAsync).toHaveBeenCalled();
    expect(screen.getByTestId('sync-all-result')).toHaveTextContent('All events synced successfully.');
  });

  it('shows partial failure summary', async () => {
    mutateAsync.mockResolvedValue({
      venueId: 'ven-1',
      attemptedCount: 2,
      succeededCount: 1,
      results: [
        { eventId: 'evt-1', title: 'Show A', success: true, errorMessage: null },
        { eventId: 'evt-2', title: 'Show B', success: false, errorMessage: 'QBO error' },
      ],
    });
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncAllButton venueId="ven-1" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('sync-all-button'));
    expect(screen.getByTestId('sync-all-result')).toHaveTextContent('Sync completed with failures: Show B');
  });

  it('shows generic error when sync request fails', async () => {
    mutateAsync.mockRejectedValue(new Error('network'));
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncAllButton venueId="ven-1" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('sync-all-button'));
    expect(screen.getByTestId('sync-all-result')).toHaveTextContent(
      'Unable to sync events. Please try again.',
    );
  });
});
