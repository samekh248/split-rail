import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOrganization,
  login,
  logout,
  mapAuthError,
  registerUser,
  registerWithOrganization,
} from '@/auth/authApi';

describe('authApi', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('login', () => {
    it('posts credentials and persists tokens', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
              expiresIn: 3600,
            }),
        }),
      );

      const result = await login({ email: 'user@example.com', password: 'Password1' });

      expect(result.accessToken).toBe('access-1');
      expect(localStorage.getItem('accessToken')).toBe('access-1');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    });
  });

  describe('register orchestration', () => {
    it('runs register → login → create-organization sequence', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'user-id',
              email: 'new@example.com',
              createdAt: '2026-01-01T00:00:00Z',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              accessToken: 'access-2',
              refreshToken: 'refresh-2',
              expiresIn: 3600,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'org-id',
              name: 'Acme',
              createdAt: '2026-01-01T00:00:00Z',
            }),
        });
      vi.stubGlobal('fetch', fetchMock);

      await registerWithOrganization({
        email: 'new@example.com',
        password: 'Password1',
        organizationName: 'Acme',
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/auth/register');
      expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/login');
      expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/organizations');
    });

    it('throws OrgCreationError when organization step fails after login', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              id: 'user-id',
              email: 'new@example.com',
              createdAt: '2026-01-01T00:00:00Z',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              accessToken: 'access-2',
              refreshToken: 'refresh-2',
              expiresIn: 3600,
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ detail: 'Organization name is required.' }),
        });
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        registerWithOrganization({
          email: 'new@example.com',
          password: 'Password1',
          organizationName: 'Acme',
        }),
      ).rejects.toThrow("couldn't set up your organization");

      expect(localStorage.getItem('accessToken')).toBe('access-2');
    });

    it('maps duplicate email on register', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 409,
          statusText: 'Conflict',
          json: () => Promise.resolve({ detail: 'Email already registered.' }),
        }),
      );

      await expect(
        registerUser({ email: 'exists@example.com', password: 'Password1' }),
      ).rejects.toThrow('409');
    });
  });

  describe('createOrganization', () => {
    it('posts organization name with auth header', async () => {
      localStorage.setItem('accessToken', 'token-abc');
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({ id: 'org-1', name: 'Acme', createdAt: '2026-01-01T00:00:00Z' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await createOrganization('Acme');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Acme' }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('clears tokens even when logout request fails', async () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Error',
          json: () => Promise.reject(new Error('fail')),
        }),
      );

      await logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('mapAuthError', () => {
    it('maps 401 to invalid credentials message', () => {
      expect(mapAuthError(new Error('401: Unauthorized'))).toBe(
        'Invalid email or password.',
      );
    });

    it('maps 409 to duplicate email message', () => {
      expect(mapAuthError(new Error('409: Conflict'))).toBe(
        'An account with this email already exists.',
      );
    });

    it('maps 500 with API detail', () => {
      expect(mapAuthError(new Error('500: An unexpected error occurred.'))).toBe(
        'An unexpected error occurred.',
      );
    });

    it('maps 500 without detail to server guidance', () => {
      expect(mapAuthError(new Error('500: Internal Server Error'))).toContain('API and database');
    });
  });
});
