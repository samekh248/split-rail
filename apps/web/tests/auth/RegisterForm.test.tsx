import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { validRegister } from '../fixtures/auth';

describe('RegisterForm', () => {
  it('renders exactly three fields', () => {
    render(<RegisterForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
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

  it('disables submit and shows progress label while pending (C6)', () => {
    render(<RegisterForm onSubmit={vi.fn()} pending />);
    const submit = screen.getByRole('button', { name: 'Creating account…' });
    expect(submit).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('submits the three field values when valid (C2)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<RegisterForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), validRegister.email);
    await user.type(screen.getByLabelText('Password'), validRegister.password);
    await user.type(
      screen.getByLabelText('Organization name'),
      validRegister.organizationName,
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: validRegister.email,
        password: validRegister.password,
        organizationName: validRegister.organizationName,
      });
    });
  });

  it('uses shared primary button styling on submit', () => {
    render(<RegisterForm onSubmit={vi.fn()} />);
    const submit = screen.getByRole('button', { name: 'Create account' });
    expect(submit).toHaveClass('auth-form__submit');
    expect(submit).toHaveClass('btn-primary');
  });

  it('shows a required error for a blank organization name (C4)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RegisterForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), validRegister.email);
    await user.type(screen.getByLabelText('Password'), validRegister.password);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Organization name is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
