import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '@/components/auth/RegisterForm';

describe('RegisterForm', () => {
  it('renders exactly three fields', () => {
    render(<RegisterForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm/i)).not.toBeInTheDocument();
  });

  it('blocks submit when fields are invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RegisterForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
  });

  it('shows form error', () => {
    render(
      <RegisterForm
        onSubmit={vi.fn()}
        formError="An account with this email already exists."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    );
  });
});
