import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { getAppPath } from '@/lib/appRoute';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: vi.fn(),
}));

import { useCanManageTeam } from '@/hooks/useCanManageTeam';

describe('SettingsNav', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/settings');
  });

  it('renders overview, organization, and integrations navigation', () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    render(<SettingsNav />);

    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Integrations' })).toBeInTheDocument();
  });

  it('shows Team link when user can manage team', () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    render(<SettingsNav />);

    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument();
  });

  it('hides Team link when user cannot manage team', () => {
    vi.mocked(useCanManageTeam).mockReturnValue(false);
    render(<SettingsNav />);

    expect(screen.queryByRole('button', { name: 'Team' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization' })).toBeInTheDocument();
  });

  it('navigates to organization settings from nav item', async () => {
    vi.mocked(useCanManageTeam).mockReturnValue(true);
    const user = userEvent.setup();
    render(<SettingsNav />);

    await user.click(screen.getByRole('button', { name: 'Organization' }));
    expect(getAppPath()).toBe('/settings/organization');
  });
});
