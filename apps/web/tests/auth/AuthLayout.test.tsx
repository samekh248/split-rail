import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from '@/components/auth/AuthLayout';

describe('AuthLayout', () => {
  it('renders main landmark with title and children', () => {
    render(
      <AuthLayout title="Sign in" subtitle="Welcome back" footer={<p>Footer</p>}>
        <form data-testid="child-form" />
      </AuthLayout>,
    );

    expect(screen.getByRole('main')).toHaveClass('auth-layout');
    expect(document.querySelector('.auth-layout__card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByTestId('child-form')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders without optional subtitle, notice, or footer', () => {
    render(
      <AuthLayout title="Create account">
        <form data-testid="child-form" />
      </AuthLayout>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByTestId('child-form')).toBeInTheDocument();
    expect(screen.queryByText('Footer')).not.toBeInTheDocument();
  });

  it('renders a provided notice node', () => {
    render(
      <AuthLayout title="Sign in" notice={<p role="status">Session expired</p>}>
        <form data-testid="child-form" />
      </AuthLayout>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Session expired');
  });
});
