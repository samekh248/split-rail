import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { getAppPath } from '@/lib/appRoute';

const mockCompleteAcceptInvitation = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();

const authState = {
  phase: 'unauthenticated' as 'unauthenticated' | 'authenticated',
  profile: null as { email: string } | null,
  pending: false,
  error: null as string | null,
};

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    phase: authState.phase,
    profile: authState.profile,
    login: mockLogin,
    completeAcceptInvitation: mockCompleteAcceptInvitation,
    logout: mockLogout,
    pending: authState.pending,
    error: authState.error,
  }),
}));

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.phase = 'unauthenticated';
    authState.profile = null;
    authState.pending = false;
    authState.error = null;
    window.history.pushState({}, '', '/');
  });

  it('shows invalid message when token is missing', () => {
    window.history.pushState({}, '', '/accept-invite');
    render(<AcceptInvitePage />);
    expect(screen.getByRole('alert')).toHaveTextContent('no longer valid');
  });

  it('validates password before accept', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.click(screen.getByTestId('accept-invite-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8 characters');
    expect(mockCompleteAcceptInvitation).not.toHaveBeenCalled();
  });

  it('accepts invitation and navigates on success', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');
    mockCompleteAcceptInvitation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Confirm password'), 'Password1');
    await user.click(screen.getByTestId('accept-invite-submit'));

    await vi.waitFor(() =>
      expect(mockCompleteAcceptInvitation).toHaveBeenCalledWith({
        token: 'abc',
        password: 'Password1',
      }),
    );
  });

  it('shows invalid token message on 404 accept error', async () => {
    window.history.pushState({}, '', '/accept-invite?token=bad');
    mockCompleteAcceptInvitation.mockRejectedValue(new Error('404: Invitation not found.'));
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Confirm password'), 'Password1');
    await user.click(screen.getByTestId('accept-invite-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent('no longer valid');
    expect(getAppPath()).toBe('/accept-invite');
  });

  it('supports existing user sign-in and accept flow', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');
    mockLogin.mockResolvedValue(undefined);
    mockCompleteAcceptInvitation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await user.click(screen.getByRole('button', { name: 'Sign in to accept' }));
    await user.type(screen.getByLabelText('Email'), 'existing@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.click(screen.getByTestId('accept-invite-submit'));

    await vi.waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(mockCompleteAcceptInvitation).toHaveBeenCalledWith({ token: 'abc' });
  });

  it('shows conflict error when accept returns 409 for new user', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');
    mockCompleteAcceptInvitation.mockRejectedValue(new Error('409: User is already a member'));
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Confirm password'), 'Password1');
    await user.click(screen.getByTestId('accept-invite-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    );
    expect(mockCompleteAcceptInvitation).toHaveBeenCalled();
  });

  it('shows signed-in accept flow and completes invitation', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');
    authState.phase = 'authenticated';
    authState.profile = { email: 'user@example.com' };
    mockCompleteAcceptInvitation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    expect(screen.getByText(/Signed in as/)).toBeInTheDocument();
    await user.click(screen.getByTestId('accept-invite-submit'));
    expect(mockCompleteAcceptInvitation).toHaveBeenCalledWith({ token: 'abc' });
  });

  it('shows email mismatch when authenticated accept returns 409', async () => {
    window.history.pushState({}, '', '/accept-invite?token=abc');
    authState.phase = 'authenticated';
    authState.profile = { email: 'user@example.com' };
    mockCompleteAcceptInvitation.mockRejectedValue(new Error('409: Email mismatch'));
    const user = userEvent.setup();
    render(<AcceptInvitePage />);

    await user.click(screen.getByTestId('accept-invite-submit'));
    expect(await screen.findByRole('heading', { name: 'Sign in with invited email' })).toBeInTheDocument();
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
  });
});
