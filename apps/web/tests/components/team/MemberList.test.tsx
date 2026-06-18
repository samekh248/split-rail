import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemberList } from '@/components/team/MemberList';
import { orgMember, orgMemberScoped } from '../../fixtures/team';

describe('MemberList', () => {
  it('renders member email, role, and all-venues scope summary', () => {
    render(<MemberList members={[orgMember]} onEdit={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('All venues')).toBeInTheDocument();
  });

  it('renders scoped venue summary for restricted members', () => {
    render(<MemberList members={[orgMemberScoped]} onEdit={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText('manager@example.com')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  it('invokes edit and remove callbacks', async () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(
      <MemberList members={[orgMember]} onEdit={onEdit} onRemove={onRemove} />,
    );

    await user.click(screen.getByTestId('edit-member-user-admin'));
    expect(onEdit).toHaveBeenCalledWith(orgMember);

    await user.click(screen.getByTestId('remove-member-user-admin'));
    expect(onRemove).toHaveBeenCalledWith(orgMember);
  });
});
