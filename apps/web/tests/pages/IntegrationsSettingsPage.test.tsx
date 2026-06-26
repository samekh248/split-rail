import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationsSettingsRoute } from '@/pages/IntegrationsSettingsRoute';

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: vi.fn(),
}));

vi.mock('@/venue/useActiveVenue', () => ({
  useActiveVenue: () => ({
    venues: [{ id: 'venue-1', name: 'Main Hall' }],
    activeVenueId: 'venue-1',
    isLoading: false,
    activateVenueId: vi.fn(),
  }),
}));

vi.mock('@/api/qbo', () => ({
  useVenueQboIntegration: () => ({
    isLoading: false,
    data: { connectionState: 'Disconnected', canPurgeCache: false },
  }),
  useQboDisconnect: () => ({ mutate: vi.fn(), isPending: false }),
  useVenueSync: () => ({ mutate: vi.fn(), isPending: false }),
  fetchQboConnectUrl: vi.fn(),
  useVenueMappings: () => ({ isLoading: false, data: { mappings: [] } }),
  useQboTrackingMappings: () => ({ isLoading: false, data: { mappings: [] } }),
  useCreateTrackingMapping: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useDeleteTrackingMapping: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: () => true,
}));

import { useIsAdmin } from '@/hooks/useIsAdmin';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('IntegrationsSettingsRoute', () => {
  it('redirect message for non-admin viewers', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);
    render(<IntegrationsSettingsRoute />, { wrapper });

    expect(screen.getByTestId('integrations-access-denied')).toBeInTheDocument();
  });

  it('renders integrations page for admin', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    render(<IntegrationsSettingsRoute />, { wrapper });

    expect(screen.getByTestId('qbo-integration-card')).toBeInTheDocument();
  });
});
