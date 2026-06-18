import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemberList } from '@/components/team/MemberList';

const members = [
  {
    id: 'user-1',
    email: 'a@example.com',
    role: { roleName: 'Admin' },
    venueScopes: [],
  },
];

describe('MemberList', () => {
  it('invokes edit and remove callbacks', async () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(
      <MemberList members={members} onEdit={onEdit} onRemove={onRemove} />,
    );

    await user.click(screen.getByTestId('edit-member-user-1'));
    expect(onEdit).toHaveBeenCalledWith(members[0]);

    await user.click(screen.getByTestId('remove-member-user-1'));
    expect(onRemove).toHaveBeenCalledWith(members[0]);
  });
});
