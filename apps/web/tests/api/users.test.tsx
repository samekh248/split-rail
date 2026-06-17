import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useChangeMemberRole,
  useOrgMembers,
  useRemoveMember,
  useUpdateMemberVenueScopes,
} from '@/api/users';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: vi.fn(() => true),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('users api hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useOrgMembers fetches members', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            { id: 'user-1', email: 'a@example.com', role: { roleName: 'Admin' }, venueScopes: [] },
          ]),
      }),
    );

    const { result } = renderHook(() => useOrgMembers(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.email).toBe('a@example.com');
  });

  it('member mutation hooks call expected endpoints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }),
    );

    const wrapper = createWrapper();
    const changeRole = renderHook(() => useChangeMemberRole(), { wrapper });
    await changeRole.result.current.mutateAsync({ userId: 'user-1', body: { roleId: 'role-2' } });
    expect(fetch).toHaveBeenCalledWith(
      '/api/users/user-1/role',
      expect.objectContaining({ method: 'PATCH' }),
    );

    const updateScopes = renderHook(() => useUpdateMemberVenueScopes(), { wrapper });
    await updateScopes.result.current.mutateAsync({
      userId: 'user-1',
      body: { venueIds: ['ven-1'] },
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/users/user-1/venue-scopes',
      expect.objectContaining({ method: 'PUT' }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(undefined) }),
    );
    const removeMember = renderHook(() => useRemoveMember(), { wrapper });
    await removeMember.result.current.mutateAsync('user-1');
    expect(fetch).toHaveBeenCalledWith(
      '/api/users/user-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
