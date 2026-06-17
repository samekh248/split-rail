import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsLandingPage } from '@/pages/SettingsLandingPage';
import { getAppPath } from '@/lib/appRoute';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: vi.fn(),
}));

import { useCanManageTeam } from '@/hooks/useCanManageTeam';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('SettingsLandingPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.history.pushState({}, '', '/settings');
  });

  it('shows Team card for admins', () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    render(<SettingsLandingPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('settings-card-team')).toBeInTheDocument();
    expect(screen.getByTestId('settings-card-organization')).toBeInTheDocument();
    expect(screen.getByTestId('settings-card-integrations')).toBeInTheDocument();
  });

  it('hides Team card for non-admins', () => {
    vi.mocked(useCanManageTeam).mockReturnValue(false);
    render(<SettingsLandingPage />, { wrapper: createWrapper() });
    expect(screen.queryByTestId('settings-card-team')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-card-organization')).toBeInTheDocument();
  });

  it('navigates to team settings from Team card', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    const user = userEvent.setup();
    render(<SettingsLandingPage />, { wrapper: createWrapper() });
    await user.click(screen.getByTestId('settings-card-team'));
    expect(getAppPath()).toBe('/settings/team');
  });

  it('navigates to organization settings from Organization card', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    const user = userEvent.setup();
    render(<SettingsLandingPage />, { wrapper: createWrapper() });
    await user.click(screen.getByTestId('settings-card-organization'));
    expect(getAppPath()).toBe('/settings/organization');
  });

  it('navigates to integrations settings from Integrations card', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    const user = userEvent.setup();
    render(<SettingsLandingPage />, { wrapper: createWrapper() });
    await user.click(screen.getByTestId('settings-card-integrations'));
    expect(getAppPath()).toBe('/settings/integrations');
  });
});
