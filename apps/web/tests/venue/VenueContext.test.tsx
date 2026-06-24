import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VenueProvider, resolveActiveVenueId } from '@/venue/VenueContext';
import { useActiveVenue } from '@/venue/useActiveVenue';
import {
  clearActiveVenueId,
  getActiveVenueId,
  setActiveVenueId,
} from '@/venue/activeVenueStorage';

const VENUE_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

const VENUE_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Hall B',
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <VenueProvider>{children}</VenueProvider>
    </QueryClientProvider>
  );
}

function Probe() {
  const ctx = useActiveVenue();
  return (
    <div>
      <span data-testid="active-id">{ctx.activeVenueId ?? 'none'}</span>
      <span data-testid="active-name">{ctx.activeVenue?.name ?? 'none'}</span>
      <span data-testid="venue-count">{ctx.venues.length}</span>
      <button type="button" onClick={() => ctx.setActiveVenue(VENUE_B.id)}>
        select-b
      </button>
      <button type="button" onClick={() => ctx.setActiveVenue(null)}>
        select-all
      </button>
    </div>
  );
}

describe('VenueProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('loads scoped venues and defaults to all venues (C4.1, C4.2)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    render(<Probe />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('active-id')).toHaveTextContent('none');
      expect(screen.getByTestId('venue-count')).toHaveTextContent('2');
    });
    expect(getActiveVenueId()).toBeNull();
  });

  it('restores remembered venue when still accessible (C4.2, C4.3)', async () => {
    setActiveVenueId(VENUE_B.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    render(<Probe />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('active-id')).toHaveTextContent(VENUE_B.id));
    expect(getActiveVenueId()).toBe(VENUE_B.id);
  });

  it('falls back to all venues when remembered venue is inaccessible (C4.4, FR-011)', async () => {
    setActiveVenueId('cccccccc-cccc-cccc-cccc-cccccccccccc');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    render(<Probe />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('active-id')).toHaveTextContent('none');
      expect(getActiveVenueId()).toBeNull();
    });
  });

  it('setActiveVenue updates context and persists (C4.5)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(<Probe />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByTestId('active-id')).toHaveTextContent('none'));

    await user.click(screen.getByRole('button', { name: 'select-b' }));

    expect(screen.getByTestId('active-id')).toHaveTextContent(VENUE_B.id);
    expect(getActiveVenueId()).toBe(VENUE_B.id);
  });

  it('setActiveVenue(null) clears selection for all venues', async () => {
    setActiveVenueId(VENUE_B.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(<Probe />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByTestId('active-id')).toHaveTextContent(VENUE_B.id));

    await user.click(screen.getByRole('button', { name: 'select-all' }));

    expect(screen.getByTestId('active-id')).toHaveTextContent('none');
    expect(getActiveVenueId()).toBeNull();
  });

  it('exposes the full context shape (C4.6)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A]),
      }),
    );

    function ShapeProbe() {
      const ctx = useActiveVenue();
      return (
        <div>
          <span data-testid="loading">{String(ctx.isLoading)}</span>
          <span data-testid="error">{String(ctx.isError)}</span>
          <span data-testid="refetch">{typeof ctx.refetch}</span>
        </div>
      );
    }

    render(<ShapeProbe />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('false');
    expect(screen.getByTestId('refetch')).toHaveTextContent('function');
  });

  it('useActiveVenue throws outside provider (C4.7)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useActiveVenue must be used within VenueProvider');
    consoleError.mockRestore();
  });

  it('empty venue list yields null active venue (C4.8)', async () => {
    clearActiveVenueId();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }),
    );

    render(<Probe />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-count')).toHaveTextContent('0'));
    expect(screen.getByTestId('active-id')).toHaveTextContent('none');
    expect(getActiveVenueId()).toBeNull();
  });

  it('rejects setActiveVenue for ids not in scoped list (FR-008)', async () => {
    setActiveVenueId(VENUE_A.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    function InvalidProbe() {
      const ctx = useActiveVenue();
      return (
        <button type="button" onClick={() => ctx.setActiveVenue('99999999-9999-9999-9999-999999999999')}>
          select-invalid
        </button>
      );
    }

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(
      <>
        <Probe />
        <InvalidProbe />
      </>,
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(screen.getByTestId('active-id')).toHaveTextContent(VENUE_A.id));

    await user.click(screen.getByRole('button', { name: 'select-invalid' }));

    expect(screen.getByTestId('active-id')).toHaveTextContent(VENUE_A.id);
    expect(getActiveVenueId()).toBe(VENUE_A.id);
  });
});

describe('resolveActiveVenueId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('clears invalid remembered venue ids', () => {
    setActiveVenueId('cccccccc-cccc-cccc-cccc-cccccccccccc');
    const resolved = resolveActiveVenueId([VENUE_A, VENUE_B]);
    expect(resolved).toBeNull();
    expect(getActiveVenueId()).toBeNull();
  });

  it('defaults to all venues on first load when no remembered id (FR-010)', () => {
    const resolved = resolveActiveVenueId([VENUE_A, VENUE_B]);
    expect(resolved).toBeNull();
    expect(getActiveVenueId()).toBeNull();
  });
});
