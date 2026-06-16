import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationCreateStep } from '@/components/onboarding/OrganizationCreateStep';

describe('OrganizationCreateStep', () => {
  it('renders organization name field only', () => {
    render(<OrganizationCreateStep onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('validates empty organization name', async () => {
    const user = userEvent.setup();
    render(<OrganizationCreateStep onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Create organization' }));
    expect(screen.getByText('Organization name is required.')).toBeInTheDocument();
  });

  it('submits organization name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OrganizationCreateStep onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Organization name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(onSubmit).toHaveBeenCalledWith('Acme');
  });

  it('disables submit while pending', () => {
    render(<OrganizationCreateStep onSubmit={vi.fn()} pending />);
    expect(screen.getByRole('button', { name: 'Creating organization…' })).toBeDisabled();
  });

  it('shows inline error', () => {
    render(
      <OrganizationCreateStep
        onSubmit={vi.fn()}
        error="Account created, but we couldn't set up your organization. Please retry."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent("couldn't set up your organization");
  });
});
