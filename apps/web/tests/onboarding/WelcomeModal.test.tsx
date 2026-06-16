import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

describe('WelcomeModal', () => {
  it('renders dialog with organization name', () => {
    render(<WelcomeModal organizationName="Acme Corp" onDismiss={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it('calls onDismiss when Get started is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<WelcomeModal organizationName="Acme" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Get started' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('calls onDismiss on Escape', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<WelcomeModal organizationName="Acme" onDismiss={onDismiss} />);

    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
