import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QboIntegrationCard } from '@/components/qbo/QboIntegrationCard';

vi.mock('@/api/qbo', () => ({
  useVenueQboIntegration: vi.fn(),
  useQboDisconnect: () => ({ mutate: vi.fn(), isPending: false }),
  useVenueSync: () => ({ mutate: vi.fn(), isPending: false }),
  fetchQboConnectUrl: vi.fn(),
}));

import { useVenueQboIntegration } from '@/api/qbo';

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <QboIntegrationCard venueId="venue-1" />
    </QueryClientProvider>,
  );
}

describe('QboIntegrationCard', () => {
  it('renders disconnected state with connect button', () => {
    vi.mocked(useVenueQboIntegration).mockReturnValue({
      isLoading: false,
      data: {
        venueId: 'venue-1',
        qboConnected: false,
        connectionState: 'Disconnected',
        canPurgeCache: false,
      },
    } as ReturnType<typeof useVenueQboIntegration>);

    renderCard();

    expect(screen.getByTestId('qbo-integration-card')).toBeInTheDocument();
    expect(screen.getByTestId('qbo-connect-button')).toHaveTextContent('Connect to QuickBooks');
  });

  it('renders connected state with metadata and force pull', () => {
    vi.mocked(useVenueQboIntegration).mockReturnValue({
      isLoading: false,
      data: {
        venueId: 'venue-1',
        qboConnected: true,
        connectionState: 'Connected',
        companyName: 'Acme Venue Co',
        realmId: '12345',
        lastSyncedAt: '2026-06-26T12:00:00Z',
        canPurgeCache: false,
      },
    } as ReturnType<typeof useVenueQboIntegration>);

    renderCard();

    expect(screen.getByTestId('qbo-integration-connected-meta')).toBeInTheDocument();
    expect(screen.getByText('Acme Venue Co')).toBeInTheDocument();
    expect(screen.getByTestId('qbo-force-pull-button')).toBeInTheDocument();
  });

  it('renders expired state with reconnect CTA', () => {
    vi.mocked(useVenueQboIntegration).mockReturnValue({
      isLoading: false,
      data: {
        venueId: 'venue-1',
        qboConnected: false,
        connectionState: 'Expired',
        canPurgeCache: false,
      },
    } as ReturnType<typeof useVenueQboIntegration>);

    renderCard();

    expect(screen.getByTestId('qbo-integration-expired-badge')).toBeInTheDocument();
    expect(screen.getByTestId('qbo-connect-button')).toHaveTextContent('Reconnect to QuickBooks');
  });
});
