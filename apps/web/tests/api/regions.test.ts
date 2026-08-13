import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeleteRegion } from '@/api/regions';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('regions api hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useDeleteRegion DELETEs with an empty body for a plain deletion', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteRegion(), { wrapper: createWrapper() });
    await result.current.mutateAsync({ regionId: 'region-1' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/regions/region-1',
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({}) }),
    );
  });

  it('useDeleteRegion sends deleteVenues:true when deleting venues too', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteRegion(), { wrapper: createWrapper() });
    await result.current.mutateAsync({ regionId: 'region-1', deleteVenues: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/regions/region-1',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ deleteVenues: true }),
      }),
    );
  });

  it('useDeleteRegion sends moveVenuesToRegionId when moving venues', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteRegion(), { wrapper: createWrapper() });
    await result.current.mutateAsync({ regionId: 'region-1', moveVenuesToRegionId: 'region-2' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/regions/region-1',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ moveVenuesToRegionId: 'region-2' }),
      }),
    );
  });

  it('useDeleteRegion invalidates both regions and venues queries on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useDeleteRegion(), { wrapper });
    await result.current.mutateAsync({ regionId: 'region-1', deleteVenues: true });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['regions'] }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['venues'] }),
      );
    });
  });
});
