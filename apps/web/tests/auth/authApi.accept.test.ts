import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInvitation } from '@/auth/authApi';

describe('authApi acceptInvitation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts accept request and persists tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'access-invite',
            refreshToken: 'refresh-invite',
            expiresIn: 3600,
            organizationId: 'org-1',
          }),
      }),
    );

    const response = await acceptInvitation({ token: 'raw-token', password: 'Password1' });

    expect(response.organizationId).toBe('org-1');
    expect(localStorage.getItem('accessToken')).toBe('access-invite');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-invite');
    expect(fetch).toHaveBeenCalledWith(
      '/api/invitations/accept',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
