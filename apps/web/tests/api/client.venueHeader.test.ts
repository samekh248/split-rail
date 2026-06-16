import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/api/client';
import {
  clearActiveVenueId,
  setActiveVenueId,
} from '@/venue/activeVenueStorage';

const VENUE_ID = '22222222-2222-2222-2222-222222222222';

describe('apiFetch venue header injection', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches X-Active-Venue-Id when an active venue is stored (C2.1)', async () => {
    setActiveVenueId(VENUE_ID);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/ledger');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Active-Venue-Id']).toBe(VENUE_ID);
  });

  it('omits the header when skipVenueContext is true (C2.2)', async () => {
    setActiveVenueId(VENUE_ID);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/venues', { skipVenueContext: true });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Active-Venue-Id']).toBeUndefined();
  });

  it('omits the header when no active venue is stored (C2.3)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/ledger');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Active-Venue-Id']).toBeUndefined();
  });

  it('re-attaches the header on 401 retry (C2.4)', async () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    setActiveVenueId(VENUE_ID);

    const { configureApiClient } = await import('@/api/client');
    configureApiClient({ onRefresh: vi.fn().mockResolvedValue(undefined), onSessionExpired: vi.fn() });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ detail: 'expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/secure');

    const retryInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const retryHeaders = retryInit.headers as Record<string, string>;
    expect(retryHeaders['X-Active-Venue-Id']).toBe(VENUE_ID);
  });

  it('preserves caller-supplied headers (C2.5)', async () => {
    setActiveVenueId(VENUE_ID);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/ledger', {
      headers: { 'X-Custom': 'value', 'X-Active-Venue-Id': 'override-id' },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Custom']).toBe('value');
    expect(headers['X-Active-Venue-Id']).toBe('override-id');
  });
});
