import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSession } from '@/auth/authApi';

describe('refreshSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts refresh token and persists rotated tokens', async () => {
    localStorage.setItem('refreshToken', 'refresh-old');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'access-new',
            refreshToken: 'refresh-new',
            expiresIn: 3600,
          }),
      }),
    );

    const result = await refreshSession();

    expect(result.accessToken).toBe('access-new');
    expect(localStorage.getItem('accessToken')).toBe('access-new');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-new');
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-old' }),
      }),
    );
  });

  it('throws when no refresh token is stored', async () => {
    await expect(refreshSession()).rejects.toThrow('401');
  });
});
