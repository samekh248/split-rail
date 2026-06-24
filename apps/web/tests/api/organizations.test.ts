import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDeleteOrganization,
  useOrganizations,
  useUpdateOrganization,
} from '@/api/organizations';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('organizations api hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useOrganizations fetches the membership list', async () => {
    const orgs = [{ id: 'o1', name: 'Acme', createdAt: '2026-06-16T00:00:00+00:00' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(orgs),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useOrganizations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(orgs);
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations', expect.any(Object));
  });

  it('useUpdateOrganization PUTs the new name and returns the updated org', async () => {
    const updated = { id: 'o1', name: 'Renamed', createdAt: '2026-06-16T00:00:00+00:00' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(updated),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateOrganization('o1'), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({ name: 'Renamed' });

    expect(response).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/o1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) }),
    );
  });

  it('useUpdateOrganization surfaces API errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ detail: 'Organization name is required.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateOrganization('o1'), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({ name: '' })).rejects.toThrow(
      '400: Organization name is required.',
    );
  });

  it('useDeleteOrganization DELETEs by id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteOrganization(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('o1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/o1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('useDeleteOrganization surfaces conflict errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: () =>
        Promise.resolve({
          detail: 'Organization cannot be deleted while it still owns venues or financial data.',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useDeleteOrganization(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('o1')).rejects.toThrow('409:');
  });
});
