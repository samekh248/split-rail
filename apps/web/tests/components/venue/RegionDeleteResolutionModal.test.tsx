import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegionDeleteResolutionModal } from '@/components/venue/RegionDeleteResolutionModal';

const REGION_WEST = { id: 'region-a', name: 'West', notes: null, organizationId: 'org-1', createdAt: '2026-01-01T00:00:00Z', venueCount: 2 };
const REGION_EAST = { id: 'region-b', name: 'East', notes: null, organizationId: 'org-1', createdAt: '2026-01-01T00:00:00Z', venueCount: 0 };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function stubRegionsAndDeleteOk(regions: typeof REGION_WEST[]) {
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

describe('RegionDeleteResolutionModal', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers both choices when another region exists, with no default selected', async () => {
    stubRegionsAndDeleteOk([REGION_WEST, REGION_EAST]);
    render(
      <RegionDeleteResolutionModal
        region={REGION_WEST}
        open
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTestId('region-delete-choice-delete-venues')).not.toBeChecked();
    expect(await screen.findByTestId('region-delete-choice-move-venues')).not.toBeChecked();
    expect(screen.getByTestId('region-delete-resolution-confirm')).toBeDisabled();
  });

  it('hides the move-venues option when no other region exists', async () => {
    stubRegionsAndDeleteOk([REGION_WEST]);
    render(
      <RegionDeleteResolutionModal
        region={REGION_WEST}
        open
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.queryByTestId('region-delete-choice-move-venues')).not.toBeInTheDocument();
    });
  });

  it('the destination select excludes the region being deleted', async () => {
    stubRegionsAndDeleteOk([REGION_WEST, REGION_EAST]);
    const user = userEvent.setup();
    render(
      <RegionDeleteResolutionModal
        region={REGION_WEST}
        open
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(await screen.findByTestId('region-delete-choice-move-venues'));
    const select = screen.getByTestId('region-delete-destination');
    expect(screen.queryByRole('option', { name: 'West' })).not.toBeInTheDocument();
    expect(select).toHaveTextContent('East');
  });

  it('confirms with deleteVenues:true when that choice is selected', async () => {
    stubRegionsAndDeleteOk([REGION_WEST, REGION_EAST]);
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <RegionDeleteResolutionModal
        region={REGION_WEST}
        open
        onClose={onClose}
        onDeleted={onDeleted}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(screen.getByTestId('region-delete-choice-delete-venues'));
    await user.click(screen.getByTestId('region-delete-resolution-confirm'));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();

    const fetchMock = vi.mocked(globalThis.fetch);
    const deleteCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'DELETE');
    expect(JSON.parse(String(deleteCall?.[1]?.body))).toEqual({ deleteVenues: true });
  });

  it('confirms with moveVenuesToRegionId when a destination is chosen', async () => {
    stubRegionsAndDeleteOk([REGION_WEST, REGION_EAST]);
    const onDeleted = vi.fn();
    const user = userEvent.setup();
    render(
      <RegionDeleteResolutionModal
        region={REGION_WEST}
        open
        onClose={vi.fn()}
        onDeleted={onDeleted}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(await screen.findByTestId('region-delete-choice-move-venues'));
    await user.selectOptions(screen.getByTestId('region-delete-destination'), REGION_EAST.id);
    expect(screen.getByTestId('region-delete-resolution-confirm')).not.toBeDisabled();
    await user.click(screen.getByTestId('region-delete-resolution-confirm'));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());

    const fetchMock = vi.mocked(globalThis.fetch);
    const deleteCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'DELETE');
    expect(JSON.parse(String(deleteCall?.[1]?.body))).toEqual({
      moveVenuesToRegionId: REGION_EAST.id,
    });
  });
});
