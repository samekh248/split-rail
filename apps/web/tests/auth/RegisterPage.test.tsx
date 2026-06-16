import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '@/pages/RegisterPage';
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext';

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const register = vi.fn().mockResolvedValue(undefined);
  const value: AuthContextValue = {
    phase: 'unauthenticated',
    authView: 'register',
    setAuthView: vi.fn(),
    pending: false,
    error: null,
    clearError: vi.fn(),
    needsOrgRetry: false,
    login: vi.fn(),
    register,
    logout: vi.fn(),
    ...overrides,
  };

  render(
    <AuthContext.Provider value={value}>
      <RegisterPage onNavigateToLogin={vi.fn()} />
    </AuthContext.Provider>,
  );

  return { register };
}

describe('RegisterPage', () => {
  it('renders registration form', () => {
    renderWithAuth();
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
  });

  it('calls register on submit', async () => {
    const user = userEvent.setup();
    const { register } = renderWithAuth();

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Organization name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Password1',
      organizationName: 'Acme',
    });
  });
});
