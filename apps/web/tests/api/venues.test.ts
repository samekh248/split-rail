import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateVenue, useVenues, useDeleteVenue } from '@/api/venues';
import { VenueProvider } from '@/venue/VenueContext';
import { getActiveVenueId, setActiveVenueId } from '@/venue/activeVenueStorage';
import { getAppPath } from '@/lib/appRoute';

const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const WORKSPACE_PATH = `/venues/${VENUE_ID}/events/${EVENT_ID}`;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function createVenueProviderWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(VenueProvider, null, children),
    );
}

describe('venues api hooks', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  it('useDeleteVenue DELETEs venue, updates cache, and clears active venue', async () => {
    const venues = [
      { id: VENUE_ID, name: 'Hall A', organizationId: 'o1', createdAt: '2026-06-16T00:00:00+00:00' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Hall B', organizationId: 'o1', createdAt: '2026-06-16T00:00:00+00:00' },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(venues),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined),
      });
    vi.stubGlobal('fetch', fetchMock);
    setActiveVenueId(VENUE_ID);

    const wrapper = createVenueProviderWrapper();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['venues'], venues);

    const VenueWrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        QueryClientProvider,
        { client },
        createElement(VenueProvider, null, children),
      );

    const { result } = renderHook(() => useDeleteVenue(), { wrapper: VenueWrapper });

    await waitFor(() => expect(result.current.mutate).toBeDefined());
    await result.current.mutateAsync(VENUE_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/venues/${VENUE_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(client.getQueryData(['venues'])).toEqual([venues[1]]);
    expect(getActiveVenueId()).toBeNull();
  });

  it('useDeleteVenue redirects from deleted venue workspace', async () => {
    window.history.pushState({}, '', WORKSPACE_PATH);
    const venues = [
      { id: VENUE_ID, name: 'Hall A', organizationId: 'o1', createdAt: '2026-06-16T00:00:00+00:00' },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(venues),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined),
      });
    vi.stubGlobal('fetch', fetchMock);
    setActiveVenueId(VENUE_ID);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(['venues'], venues);

    const VenueWrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        QueryClientProvider,
        { client },
        createElement(VenueProvider, null, children),
      );

    const { result } = renderHook(() => useDeleteVenue(), { wrapper: VenueWrapper });

    await waitFor(() => expect(result.current.mutate).toBeDefined());
    await result.current.mutateAsync(VENUE_ID);

    expect(getAppPath()).toBe('/');
  });

  it('useDeleteVenue surfaces not-found errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'Venue not found.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteVenue(), { wrapper: createVenueProviderWrapper() });

    await expect(result.current.mutateAsync('missing')).rejects.toThrow('404: Venue not found.');
  });
});
