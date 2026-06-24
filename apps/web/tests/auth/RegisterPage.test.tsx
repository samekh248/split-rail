import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '@/pages/RegisterPage';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';

function baseAuthValue(): AuthContextValue {
  return {
    phase: 'unauthenticated',
    profile: null,
    justOnboarded: false,
    authView: 'register',
    setAuthView: vi.fn(),
    pending: false,
    error: null,
    clearError: vi.fn(),
    login: vi.fn(),
    onboard: vi.fn(),
    register: vi.fn(),
    createOrganization: vi.fn(),
    logout: vi.fn(),
    dismissWelcome: vi.fn(),
    sessionExpired: false,
  };
}

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const onboard = vi.fn().mockResolvedValue(undefined);
  const value: AuthContextValue = {
    ...baseAuthValue(),
    onboard,
    register: onboard,
    ...overrides,
  };

  render(
    <AuthContext.Provider value={value}>
      <RegisterPage onNavigateToLogin={vi.fn()} />
    </AuthContext.Provider>,
  );

  return { onboard };
}

describe('RegisterPage', () => {
  it('renders registration form', () => {
    renderWithAuth();
    expect(screen.getByRole('main')).toHaveClass('auth-layout');
    expect(document.querySelector('.auth-layout__card')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Split Rail' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create account' })).toHaveClass(
      'auth-layout__title',
    );
    expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toHaveClass('btn-primary');
  });

  it('calls onboard on submit', async () => {
    const user = userEvent.setup();
    const { onboard } = renderWithAuth();

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Organization name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onboard).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Password1',
      organizationName: 'Acme',
    });
  });
});
