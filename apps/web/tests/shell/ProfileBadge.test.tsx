import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileBadge } from '@/components/shell/ProfileBadge';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { workspaceAdminProfile } from '../utils/mockWorkspaceFetch';

const mockLogout = vi.fn();

function renderProfileBadge(showDisplayName = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      if (String(input).includes('/users/me')) {
        return { ok: true, status: 200, json: () => Promise.resolve(workspaceAdminProfile) };
      }
      return { ok: true, status: 200, json: () => Promise.resolve([]) };
    }),
  );

  const authValue = {
    phase: 'authenticated',
    profile: null,
    justOnboarded: false,
    authView: 'login',
    setAuthView: vi.fn(),
    pending: false,
    error: null,
    clearError: vi.fn(),
    login: vi.fn(),
    onboard: vi.fn(),
    register: vi.fn(),
    createOrganization: vi.fn(),
    logout: mockLogout,
    dismissWelcome: vi.fn(),
    completeAcceptInvitation: vi.fn(),
    sessionExpired: false,
  } satisfies AuthContextValue;

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ProfileBadge showDisplayName={showDisplayName} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ProfileBadge', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockLogout.mockClear();
    window.history.pushState({}, '', '/');
  });

  it('opens menu with Settings and Sign out', async () => {
    const user = userEvent.setup();
    renderProfileBadge();

    await user.click(await screen.findByTestId('profile-badge-trigger'));
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('hides display name when collapsed', async () => {
    renderProfileBadge(false);
    expect(await screen.findByTestId('profile-badge-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-badge-name')).not.toBeInTheDocument();
  });

  it('closes menu on Escape', async () => {
    const user = userEvent.setup();
    renderProfileBadge();
    await user.click(await screen.findByTestId('profile-badge-trigger'));
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('profile-badge-menu')).not.toBeInTheDocument();
  });

  it('signs out from menu', async () => {
    const user = userEvent.setup();
    renderProfileBadge();
    await user.click(await screen.findByTestId('profile-badge-trigger'));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('profile trigger is keyboard focusable', async () => {
    const user = userEvent.setup();
    renderProfileBadge();
    await user.tab();
    expect(screen.getByTestId('profile-badge-trigger')).toHaveFocus();
  });
});
