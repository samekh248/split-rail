import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from '@/components/auth/AuthLayout';

describe('AuthLayout theme', () => {
  it('uses auth-layout branded class structure', () => {
    render(
      <AuthLayout title="Sign in" subtitle="Welcome">
        <form className="auth-form" data-testid="form" />
      </AuthLayout>,
    );

    expect(screen.getByRole('main')).toHaveClass('auth-layout');
    expect(document.querySelector('.auth-layout__card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('auth-layout__title');
  });
});
