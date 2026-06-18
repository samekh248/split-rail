import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InvitationList } from '@/components/team/InvitationList';
import { acceptedInvitation, pendingInvitation } from '../../fixtures/team';

const mockResend = { mutateAsync: vi.fn(), isPending: false };
const mockCancel = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/invitations', () => ({
  useResendInvitation: () => mockResend,
  useCancelInvitation: () => mockCancel,
}));

describe('InvitationList', () => {
  it('renders invitation email, role, status, and venue scope summary', () => {
    render(<InvitationList invitations={[pendingInvitation]} />);

    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByText('Promoter')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  it('shows resend and cancel for non-accepted invitations', async () => {
    const user = userEvent.setup();
    render(
      <InvitationList invitations={[pendingInvitation]} />,
    );

    await user.click(screen.getByTestId('resend-invitation-inv-pending'));
    expect(mockResend.mutateAsync).toHaveBeenCalledWith('inv-pending');

    await user.click(screen.getByTestId('cancel-invitation-inv-pending'));
    expect(mockCancel.mutateAsync).toHaveBeenCalledWith('inv-pending');
  });

  it('hides actions for accepted invitations', () => {
    render(<InvitationList invitations={[acceptedInvitation]} />);

    expect(screen.queryByTestId('resend-invitation-inv-accepted')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-invitation-inv-accepted')).not.toBeInTheDocument();
  });
});
