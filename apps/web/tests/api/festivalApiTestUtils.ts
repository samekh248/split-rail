import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

export const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
export const BLOCK_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const ARTIST_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
export const BUCKET_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

export function createWrapper(client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

export function mockFetchJson(payload: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });
}
