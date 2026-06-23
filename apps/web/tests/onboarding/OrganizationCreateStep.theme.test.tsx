import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationCreateStep } from '@/components/onboarding/OrganizationCreateStep';

describe('OrganizationCreateStep theme', () => {
  it('renders auth layout with primary submit button', () => {
    render(<OrganizationCreateStep onSubmit={vi.fn()} />);

    expect(document.querySelector('.auth-layout')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Create organization' });
    expect(submit).toHaveClass('auth-form__submit');
    expect(submit).toHaveClass('btn-primary');
  });

  it('submits organization name through branded form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OrganizationCreateStep onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Organization name'), 'Acme Venue Co');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(onSubmit).toHaveBeenCalledWith('Acme Venue Co');
  });
});
