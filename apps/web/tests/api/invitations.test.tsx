import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInvitation, useCreateInvitation, useInvitations } from '@/api/invitations';

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

describe('invitations api hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useInvitations fetches invitations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              id: 'inv-1',
              email: 'new@example.com',
              roleName: 'Promoter',
              status: 'pending',
              venueScopes: [],
            },
          ]),
      }),
    );

    const { result } = renderHook(() => useInvitations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.email).toBe('new@example.com');
  });

  it('useCreateInvitation posts invitation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 'inv-2',
            email: 'invite@example.com',
            roleName: 'Admin',
            status: 'pending',
            venueScopes: [],
          }),
      }),
    );

    const { result } = renderHook(() => useCreateInvitation(), { wrapper: createWrapper() });
    await result.current.mutateAsync({
      email: 'invite@example.com',
      roleId: 'role-1',
      venueIds: [],
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/invitations',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('acceptInvitation posts anonymously', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'access',
            refreshToken: 'refresh',
            expiresIn: 3600,
            organizationId: 'org-1',
          }),
      }),
    );

    const response = await acceptInvitation({ token: 'tok', password: 'Password1' });
    expect(response.accessToken).toBe('access');
    expect(fetch).toHaveBeenCalledWith(
      '/api/invitations/accept',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
