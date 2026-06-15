import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettlementLockedBanner } from '@/components/settlement/SettlementLockedBanner';

const refetch = vi.fn().mockResolvedValue({
  data: { url: 'https://storage.test/settlement.pdf', expiresAt: '2026-06-15T12:00:00Z' },
});

vi.mock('@/api/settlement', () => ({
  useSettlementPdfLink: () => ({
    data: { url: 'https://storage.test/settlement.pdf', expiresAt: '2026-06-15T12:00:00Z' },
    refetch,
    isFetching: false,
  }),
}));

describe('SettlementLockedBanner', () => {
  it('renders when status is SETTLED with PDF available', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="SETTLED"
          settlementPdfAvailable
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('settlement-locked-banner')).toHaveTextContent('Settled / Locked');
    expect(screen.getByTestId('settlement-pdf-link')).toBeInTheDocument();
  });

  it('is hidden when not settled', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="PRE_SHOW"
          settlementPdfAvailable={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('settlement-locked-banner')).not.toBeInTheDocument();
  });

  it('opens PDF link in new tab', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="SETTLED"
          settlementPdfAvailable
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('settlement-pdf-link'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://storage.test/settlement.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });
});
