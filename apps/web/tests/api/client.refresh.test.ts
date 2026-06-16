import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  configureApiClient,
  resetSessionExpiredLatch,
  SessionExpiredError,
} from '@/api/client';

describe('api client refresh recovery', () => {
  const onRefresh = vi.fn();
  const onSessionExpired = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    onRefresh.mockReset();
    onSessionExpired.mockReset();
    resetSessionExpiredLatch();
    configureApiClient({ onRefresh, onSessionExpired });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers and invokes onRefresh and onSessionExpired handlers', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    onRefresh.mockResolvedValue(undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/secure')).resolves.toEqual({ ok: true });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('recovers from 401 via onRefresh and replays once on success', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    onRefresh.mockResolvedValue(undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'ok' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/data')).resolves.toEqual({ data: 'ok' });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('passes through non-401 errors without calling onRefresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ detail: 'Missing' }),
      }),
    );

    await expect(apiFetch('/missing')).rejects.toThrow('404: Missing');
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('replays POST with preserved method and body', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    onRefresh.mockResolvedValue(undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ saved: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const body = JSON.stringify({ name: 'test' });
    await expect(
      apiFetch('/items', { method: 'POST', body }),
    ).resolves.toEqual({ saved: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/items',
      expect.objectContaining({ method: 'POST', body }),
    );
  });

  it('does not recover /auth/refresh when skipAuthRecovery is set', async () => {
    localStorage.setItem('refreshToken', 'refresh');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Invalid refresh' }),
      }),
    );

    await expect(
      apiFetch('/auth/refresh', { method: 'POST', skipAuthRecovery: true }),
    ).rejects.toThrow('401: Invalid refresh');
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signals session expired when refresh auth fails', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    onRefresh.mockRejectedValue(new Error('401: Invalid refresh token'));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      }),
    );

    await expect(apiFetch('/secure')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('signals session expired immediately when no refresh token', async () => {
    localStorage.setItem('accessToken', 'old-access');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      }),
    );

    await expect(apiFetch('/secure')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('retains credentials on network failure during refresh', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    onRefresh.mockRejectedValue(new TypeError('Failed to fetch'));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      }),
    );

    await expect(apiFetch('/secure')).rejects.toThrow('Failed to fetch');
    expect(localStorage.getItem('accessToken')).toBe('old-access');
    expect(localStorage.getItem('refreshToken')).toBe('refresh');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out when replay still returns 401 without second refresh', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    onRefresh.mockResolvedValue(undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Still unauthorized' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/secure')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent 401s into a single refresh', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh');
    let refreshResolve!: () => void;
    onRefresh.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          refreshResolve = resolve;
        }),
    );

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const p1 = apiFetch('/a');
    const p2 = apiFetch('/b');
    const p3 = apiFetch('/c');

    await Promise.resolve();
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      }),
    );
    refreshResolve();

    await expect(Promise.all([p1, p2, p3])).resolves.toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
    ]);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onSessionExpired once for concurrent unrecoverable sessions', async () => {
    localStorage.setItem('accessToken', 'old-access');
    onRefresh.mockRejectedValue(new Error('401: Invalid'));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      }),
    );

    const results = await Promise.allSettled([apiFetch('/a'), apiFetch('/b'), apiFetch('/c')]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not write tokens to console during recovery', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('accessToken', 'secret-access-token');
    localStorage.setItem('refreshToken', 'secret-refresh-token');
    onRefresh.mockResolvedValue(undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/secure');

    for (const call of [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls]) {
      const text = call.map(String).join(' ');
      expect(text).not.toContain('secret-access-token');
      expect(text).not.toContain('secret-refresh-token');
    }

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
