import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { getAppPath } from '@/lib/appRoute';
import { writeSettingsReturnPath } from '@/lib/settingsReturnStorage';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: vi.fn(),
}));

import { useCanManageTeam } from '@/hooks/useCanManageTeam';

describe('SettingsNav', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/settings');
    vi.mocked(useCanManageTeam).mockReturnValue(true);
  });

  it('renders sidebar navigation with return link and settings sections', () => {
    render(<SettingsNav variant="sidebar" />);

    expect(screen.getByTestId('settings-sidebar-nav')).toBeInTheDocument();
    expect(screen.getByTestId('settings-return-to-app')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to App' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument();
  });

  it('hides Team link when user cannot manage team', () => {
    vi.mocked(useCanManageTeam).mockReturnValue(false);
    render(<SettingsNav variant="sidebar" />);

    expect(screen.queryByRole('button', { name: 'Team' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization' })).toBeInTheDocument();
  });

  it('navigates to organization settings from nav item', async () => {
    const user = userEvent.setup();
    render(<SettingsNav variant="sidebar" />);

    await user.click(screen.getByRole('button', { name: 'Organization' }));
    expect(getAppPath()).toBe('/settings/organization');
  });

  it('returns to the saved app path from Return to App', async () => {
    window.history.pushState({}, '', '/settings/team');
    writeSettingsReturnPath('/venues/new');
    const user = userEvent.setup();
    render(<SettingsNav variant="sidebar" />);

    await user.click(screen.getByRole('button', { name: 'Return to App' }));
    expect(getAppPath()).toBe('/venues/new');
  });

  it('renders horizontal variant for legacy top-bar layout', () => {
    render(<SettingsNav variant="horizontal" />);

    expect(screen.getByRole('navigation', { name: 'Settings' })).toHaveClass(
      'settings-nav--horizontal',
    );
  });
});
