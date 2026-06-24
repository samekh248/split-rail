import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const login = vi.fn().mockResolvedValue(undefined);
  const value: AuthContextValue = {
    phase: 'unauthenticated',
    profile: null,
    justOnboarded: false,
    authView: 'login',
    setAuthView: vi.fn(),
    pending: false,
    error: null,
    clearError: vi.fn(),
    login,
    onboard: vi.fn(),
    register: vi.fn(),
    createOrganization: vi.fn(),
    logout: vi.fn(),
    dismissWelcome: vi.fn(),
    sessionExpired: false,
    ...overrides,
  };

  render(
    <AuthContext.Provider value={value}>
      <LoginPage onNavigateToRegister={vi.fn()} />
    </AuthContext.Provider>,
  );

  return { login };
}

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithAuth();
    expect(screen.getByRole('main')).toHaveClass('auth-layout');
    expect(document.querySelector('.auth-layout__card')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Split Rail' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toHaveClass('auth-layout__title');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveClass('btn-primary');
  });

  it('calls login on submit', async () => {
    const user = userEvent.setup();
    const { login } = renderWithAuth();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1',
    });
  });

  it('shows session-expired notice when sessionExpired is true', () => {
    renderWithAuth({ sessionExpired: true });
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Your session expired — please sign in again.');
  });

  it('hides session-expired notice when sessionExpired is false', () => {
    renderWithAuth({ sessionExpired: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
