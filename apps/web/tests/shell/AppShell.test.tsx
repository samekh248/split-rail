import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHome } from '@/pages/DashboardHome';
import { createShellWrapper } from './shellTestUtils';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: () => <div data-testid="mock-ledger-page">ledger</div>,
}));

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
  });

  it('renders left rail, top bar, and main content regions', async () => {
    render(<DashboardHome />, { wrapper: createShellWrapper() });

    expect(await screen.findByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-bar')).toBeInTheDocument();
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
  });

  it('shows organization name in top bar', async () => {
    render(<DashboardHome />, { wrapper: createShellWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('top-bar-org-name')).toHaveTextContent('Acme Org');
    });
  });

  it('does not show legacy Settings or Sign out in dashboard header', async () => {
    render(<DashboardHome />, { wrapper: createShellWrapper() });

    await screen.findByTestId('dashboard-workspace-bar');
    expect(screen.queryByTestId('header-settings')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows settings navigation in sidebar on settings route', async () => {
    window.history.pushState({}, '', '/settings');

    const { SettingsLandingPage } = await import('@/pages/SettingsLandingPage');
    render(<SettingsLandingPage />, {
      wrapper: createShellWrapper({}, { venues: [] }, { sidebarNavigation: 'settings' }),
    });

    await screen.findByRole('heading', { name: 'Settings' });
    expect(screen.getByTestId('settings-sidebar-nav')).toBeInTheDocument();
    expect(screen.getByTestId('settings-return-to-app')).toBeInTheDocument();
    expect(screen.queryByTestId('global-nav-dashboard')).not.toBeInTheDocument();
  });
});
