import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

describe('WelcomeModal theme', () => {
  it('uses branded modal classes and primary CTA', () => {
    render(<WelcomeModal organizationName="Acme Corp" onDismiss={vi.fn()} />);

    expect(document.querySelector('.welcome-modal__backdrop')).toBeInTheDocument();
    expect(document.querySelector('.welcome-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('welcome-modal__title');

    const dismiss = screen.getByRole('button', { name: 'Get started' });
    expect(dismiss).toHaveClass('welcome-modal__dismiss');
    expect(dismiss).toHaveClass('btn-primary');
  });

  it('dismisses via branded primary button', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<WelcomeModal organizationName="Acme" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Get started' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
