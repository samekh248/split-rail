import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormField } from '@/components/auth/FormField';

describe('FormField', () => {
  it('associates label with input', () => {
    render(
      <FormField
        id="test-email"
        label="Email"
        type="email"
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'test-email');
  });

  it('masks password input', () => {
    render(
      <FormField
        id="test-password"
        label="Password"
        type="password"
        value="secret"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('sets aria-invalid and aria-describedby when error present', () => {
    render(
      <FormField
        id="test-field"
        label="Email"
        type="email"
        value=""
        onChange={vi.fn()}
        error="Invalid email"
      />,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'test-field-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormField
        id="test-field"
        label="Email"
        type="email"
        value=""
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText('Email'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
