import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InvitationList } from '@/components/team/InvitationList';

const mockResend = { mutateAsync: vi.fn(), isPending: false };
const mockCancel = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/invitations', () => ({
  useResendInvitation: () => mockResend,
  useCancelInvitation: () => mockCancel,
}));

describe('InvitationList', () => {
  it('shows resend and cancel for non-accepted invitations', async () => {
    const user = userEvent.setup();
    render(
      <InvitationList
        invitations={[
          {
            id: 'inv-1',
            email: 'a@example.com',
            roleName: 'Promoter',
            status: 'pending',
            expiresAt: '2026-12-01T00:00:00Z',
            venueScopes: [],
          },
        ]}
      />,
    );

    await user.click(screen.getByTestId('resend-invitation-inv-1'));
    expect(mockResend.mutateAsync).toHaveBeenCalledWith('inv-1');

    await user.click(screen.getByTestId('cancel-invitation-inv-1'));
    expect(mockCancel.mutateAsync).toHaveBeenCalledWith('inv-1');
  });

  it('hides actions for accepted invitations', () => {
    render(
      <InvitationList
        invitations={[
          {
            id: 'inv-2',
            email: 'b@example.com',
            roleName: 'Admin',
            status: 'accepted',
            expiresAt: '2026-12-01T00:00:00Z',
            venueScopes: [],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('resend-invitation-inv-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-invitation-inv-2')).not.toBeInTheDocument();
  });
});
