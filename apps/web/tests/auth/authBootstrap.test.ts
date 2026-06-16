import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapAuthSession, routeProfile } from '@/auth/authBootstrap';
import type { UserProfileResponse } from '@/types/generated-api';

function profileWithOrg(): UserProfileResponse {
  return {
    id: 'user-1',
    email: 'user@example.com',
    organization: { id: 'org-1', name: 'Acme' },
    role: { roleName: 'Admin', permissions: {} },
    venueScopes: [],
  };
}

function profileWithoutOrg(): UserProfileResponse {
  return {
    id: 'user-2',
    email: 'orgless@example.com',
    organization: null,
    role: null,
    venueScopes: [],
  };
}

describe('routeProfile', () => {
  it('routes org present to authenticated', () => {
    expect(routeProfile(profileWithOrg())).toBe('authenticated');
  });

  it('routes org null to needs-organization', () => {
    expect(routeProfile(profileWithoutOrg())).toBe('needs-organization');
  });
});

describe('bootstrapAuthSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns unauthenticated when no access token', async () => {
    const result = await bootstrapAuthSession();
    expect(result).toEqual({ profile: null, phase: 'unauthenticated' });
  });

  it('loads profile when access token is valid', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      }),
    );

    const result = await bootstrapAuthSession();
    expect(result.phase).toBe('authenticated');
    expect(result.profile?.organization?.name).toBe('Acme');
  });

  it('refreshes on 401 and retries profile once', async () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'refresh-valid');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'access-new',
            refreshToken: 'refresh-new',
            expiresIn: 3600,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithOrg()),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await bootstrapAuthSession();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.phase).toBe('authenticated');
    expect(localStorage.getItem('accessToken')).toBe('access-new');
  });

  it('clears tokens and returns unauthenticated when refresh fails', async () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'bad-refresh');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Invalid refresh token' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await bootstrapAuthSession();

    expect(result.phase).toBe('unauthenticated');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('routes org-less profile to needs-organization after reload', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileWithoutOrg()),
      }),
    );

    const result = await bootstrapAuthSession();
    expect(result.phase).toBe('needs-organization');
  });
});
