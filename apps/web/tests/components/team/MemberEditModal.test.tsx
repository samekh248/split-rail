import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemberEditModal } from '@/components/team/MemberEditModal';

vi.mock('@/api/roles', () => ({
  useRoles: () => ({
    data: [
      { id: 'role-1', roleName: 'Admin' },
      { id: 'role-2', roleName: 'Promoter' },
    ],
  }),
}));

vi.mock('@/api/venues', () => ({
  useVenues: () => ({
    data: [{ id: 'ven-1', name: 'Hall A' }],
  }),
}));

const mockChangeRole = { mutateAsync: vi.fn(), isPending: false };
const mockUpdateScopes = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/users', () => ({
  useChangeMemberRole: () => mockChangeRole,
  useUpdateMemberVenueScopes: () => mockUpdateScopes,
}));

const member = {
  id: 'user-1',
  email: 'member@example.com',
  role: { id: 'role-2', roleName: 'Promoter' },
  venueScopes: [],
};

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('MemberEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeRole.mutateAsync.mockResolvedValue({});
    mockUpdateScopes.mutateAsync.mockResolvedValue({});
  });

  it('saves role changes', async () => {
    mockChangeRole.mutateAsync.mockResolvedValue({});
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <MemberEditModal member={member} open onClose={onClose} onSaved={onSaved} />,
      { wrapper: Wrapper },
    );

    await user.selectOptions(screen.getByLabelText('Role'), 'role-1');
    await user.click(screen.getByTestId('member-edit-save'));

    expect(mockChangeRole.mutateAsync).toHaveBeenCalledWith({
      userId: 'user-1',
      body: { roleId: 'role-1' },
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('cancels without saving', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <MemberEditModal member={member} open onClose={onClose} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockChangeRole.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows last-admin error', async () => {
    mockChangeRole.mutateAsync.mockRejectedValue(new Error('400: Cannot remove the last admin.'));
    const user = userEvent.setup();

    render(
      <MemberEditModal member={member} open onClose={vi.fn()} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.selectOptions(screen.getByLabelText('Role'), 'role-1');
    await user.click(screen.getByTestId('member-edit-save'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot remove the last admin.');
  });
});
