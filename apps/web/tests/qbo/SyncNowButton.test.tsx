import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SyncNowButton } from '@/components/qbo/SyncNowButton';

const mutateAsync = vi.fn().mockResolvedValue({});
let syncPending = false;

vi.mock('@/api/user', () => ({
  useCanTriggerQboSync: vi.fn(),
}));

vi.mock('@/api/qbo', () => ({
  useTriggerSync: () => ({ mutateAsync, isPending: syncPending }),
  qboKeys: {
    unmappedCount: () => ['qbo', 'count'],
    syncStatus: () => ['qbo', 'status'],
  },
}));

vi.mock('@/api/ledger', () => ({
  ledgerKeys: { grid: () => ['ledger'] },
}));

import { useCanTriggerQboSync } from '@/api/user';

describe('SyncNowButton', () => {
  it('is hidden without permission', () => {
    syncPending = false;
    vi.mocked(useCanTriggerQboSync).mockReturnValue(false);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncNowButton venueId="ven-1" eventId="evt-1" />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('sync-now-button')).not.toBeInTheDocument();
  });

  it('triggers sync when clicked', async () => {
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncNowButton venueId="ven-1" eventId="evt-1" />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('sync-now-button'));
    expect(mutateAsync).toHaveBeenCalled();
  });

  it('uses shared compact primary button styling', () => {
    syncPending = false;
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncNowButton venueId="ven-1" eventId="evt-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('sync-now-button')).toHaveClass('btn-primary--compact');
  });

  it('shows pending label while sync is in progress', () => {
    syncPending = true;
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SyncNowButton venueId="ven-1" eventId="evt-1" />
      </QueryClientProvider>,
    );

    const button = screen.getByTestId('sync-now-button');
    expect(button).toHaveTextContent('Syncing…');
    expect(button).toBeDisabled();
  });
});
