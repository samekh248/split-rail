import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateVenue, useVenues } from '@/api/venues';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('venues api hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useVenues fetches the accessible venue list', async () => {
    const venues = [
      { id: 'v1', name: 'The Roxy', organizationId: 'o1', createdAt: '2026-06-16T00:00:00+00:00' },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(venues),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useVenues(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(venues);
  });

  it('useUpdateVenue PUTs the new name and returns the updated venue', async () => {
    const updated = {
      id: 'v1',
      name: 'The Roxy (Updated)',
      organizationId: 'o1',
      createdAt: '2026-06-16T00:00:00+00:00',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(updated),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateVenue('v1'), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({ name: 'The Roxy (Updated)' });

    expect(response).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/venues/v1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'The Roxy (Updated)' }),
      }),
    );
  });

  it('useUpdateVenue surfaces not-found errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'Venue not found.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateVenue('missing'), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync({ name: 'X' })).rejects.toThrow(
      '404: Venue not found.',
    );
  });
});
