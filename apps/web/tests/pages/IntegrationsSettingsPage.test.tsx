import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationsSettingsPage } from '@/pages/IntegrationsSettingsPage';
import { IntegrationsSettingsRoute } from '@/pages/IntegrationsSettingsRoute';

vi.mock('@/api/user', () => ({
  useUserProfile: vi.fn(),
}));

vi.mock('@/venue/useActiveVenue', () => ({
  useActiveVenue: () => ({
    venues: [{ id: 'venue-1', name: 'Main Hall' }],
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

import { useUserProfile } from '@/api/user';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('IntegrationsSettingsRoute', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/settings/integrations');
  });

  it('redirect message for non-admin viewers', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      isPending: false,
      data: { role: { roleName: 'Member' } },
    } as ReturnType<typeof useUserProfile>);
    render(<IntegrationsSettingsRoute />, { wrapper });

    expect(screen.getByTestId('integrations-access-denied')).toBeInTheDocument();
  });

  it('renders integrations page for admin', () => {
    vi.mocked(useUserProfile).mockReturnValue({
      isPending: false,
      data: { role: { roleName: 'Admin' } },
    } as ReturnType<typeof useUserProfile>);
    render(<IntegrationsSettingsRoute />, { wrapper });

    expect(screen.getByTestId('qbo-integration-card')).toBeInTheDocument();
  });
});

describe('IntegrationsSettingsPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/settings/integrations');
  });

  it('shows connect toast once after OAuth redirect and clears query params', () => {
    window.history.replaceState(
      {},
      '',
      '/settings/integrations?venueId=venue-1&qboConnected=true',
    );

    render(<IntegrationsSettingsPage />, { wrapper });

    expect(screen.getByTestId('qbo-connected-toast')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/settings/integrations');
    expect(window.location.search).toBe('');
  });

  it('does not show connect toast on a normal visit', () => {
    render(<IntegrationsSettingsPage />, { wrapper });

    expect(screen.queryByTestId('qbo-connected-toast')).not.toBeInTheDocument();
  });
});
