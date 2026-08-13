import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegionManagementPanel } from '@/components/booking/RegionManagementPanel';

const REGION_EMPTY = {
  id: 'region-empty',
  name: 'Empty Region',
  notes: null,
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  venueCount: 0,
};

const REGION_OCCUPIED = {
  id: 'region-occupied',
  name: 'Occupied Region',
  notes: null,
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  venueCount: 3,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function stubFetch(regions: typeof REGION_EMPTY[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/regions') && (!init?.method || init.method === 'GET')) {
        return { ok: true, status: 200, json: () => Promise.resolve(regions) };
      }
      if (url.includes('/api/regions') && init?.method === 'DELETE') {
        return { ok: true, status: 204, json: () => Promise.resolve(undefined) };
      }
      return { ok: true, status: 200, json: () => Promise.resolve({}) };
    }),
  );
}

describe('RegionManagementPanel', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes a zero-venue region immediately with no resolution modal (regression baseline)', async () => {
    stubFetch([REGION_EMPTY]);
    const user = userEvent.setup();
    render(<RegionManagementPanel open onClose={vi.fn()} />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`delete-region-${REGION_EMPTY.id}`));

    expect(screen.queryByTestId('region-delete-resolution-modal')).not.toBeInTheDocument();
    await waitFor(() => {
      const fetchMock = vi.mocked(globalThis.fetch);
      expect(
        fetchMock.mock.calls.some(
          (call) => call[1]?.method === 'DELETE' && String(call[0]).includes(REGION_EMPTY.id),
        ),
      ).toBe(true);
    });
  });

  it('right-aligns the Actions header in the regions table', async () => {
    stubFetch([REGION_EMPTY]);
    render(<RegionManagementPanel open onClose={vi.fn()} />, { wrapper: createWrapper() });

    expect(
      await screen.findByRole('columnheader', { name: 'Actions' }),
    ).toHaveClass('region-panel__actions-col');
  });

  it('opens the resolution modal instead of deleting immediately when the region has venues', async () => {
    stubFetch([REGION_OCCUPIED]);
    const user = userEvent.setup();
    render(<RegionManagementPanel open onClose={vi.fn()} />, { wrapper: createWrapper() });

    await user.click(await screen.findByTestId(`delete-region-${REGION_OCCUPIED.id}`));

    expect(await screen.findByTestId('region-delete-resolution-modal')).toBeInTheDocument();
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'DELETE')).toBe(false);
  });
});
