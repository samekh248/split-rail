import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

describe('WelcomeModal', () => {
  it('renders branded dialog with organization name and primary dismiss', () => {
    render(<WelcomeModal organizationName="Acme Corp" onDismiss={vi.fn()} />);

    expect(document.querySelector('.welcome-modal__backdrop')).toBeInTheDocument();
    const modalPanel = document.querySelector('.welcome-modal');
    expect(modalPanel).toBeInTheDocument();
    expect(modalPanel).toHaveClass('welcome-modal');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('welcome-modal__title');

    const dismiss = screen.getByRole('button', { name: 'Get started' });
    expect(dismiss).toHaveClass('welcome-modal__dismiss');
    expect(dismiss).toHaveClass('btn-primary');
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

  it('calls onDismiss when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<WelcomeModal organizationName="Acme" onDismiss={onDismiss} />);

    const backdrop = document.querySelector('.welcome-modal__backdrop');
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
