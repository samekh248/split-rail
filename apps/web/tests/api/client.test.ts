import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ledgerPath } from '@/api/client';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ledgerPath builds the venue event prefix', () => {
    expect(ledgerPath('venue-1', 'event-1')).toBe('/venues/venue-1/events/event-1');
  });

  it('apiFetch returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      }),
    );

    await expect(apiFetch('/test')).resolves.toEqual({ ok: true });
  });

  it('apiFetch returns undefined for 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );

    await expect(apiFetch('/test')).resolves.toBeUndefined();
  });

  it('apiFetch throws with API detail on error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ detail: 'Event not found.' }),
      }),
    );

    await expect(apiFetch('/missing')).rejects.toThrow('404: Event not found.');
  });

  it('apiFetch falls back to status text when error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('invalid json')),
      }),
    );

    await expect(apiFetch('/broken')).rejects.toThrow('500: Internal Server Error');
  });

  it('apiFetch attaches bearer token when present', async () => {
    localStorage.setItem('accessToken', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/secure');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/secure',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });
});
