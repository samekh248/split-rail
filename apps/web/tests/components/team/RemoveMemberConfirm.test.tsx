import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RemoveMemberConfirm } from '@/components/team/RemoveMemberConfirm';

const member = {
  id: 'user-1',
  email: 'member@example.com',
  role: { roleName: 'Promoter' },
  venueScopes: [],
};

describe('RemoveMemberConfirm', () => {
  it('confirms removal', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <RemoveMemberConfirm member={member} open onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByTestId('remove-member-confirm-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancels removal', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <RemoveMemberConfirm member={member} open onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
