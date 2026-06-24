import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_VENUES_LABEL, VenueSwitcher } from '@/components/venue/VenueSwitcher';
import { VenueProvider } from '@/venue/VenueContext';
import { setActiveVenueId } from '@/venue/activeVenueStorage';

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

describe('VenueSwitcher', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('defaults to All Venues when no venue is selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
    await user.click(screen.getByTestId('venue-switcher-trigger'));

    expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: /Hall A/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('lists All Venues and venues by name and indicates the active venue (C5.1, C5.2)', async () => {
    setActiveVenueId(VENUE_A.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'));
    await user.click(screen.getByTestId('venue-switcher-trigger'));

    expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('option', { name: /Hall A/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /Hall B/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setActiveVenue when a different venue is chosen (C5.3)', async () => {
    setActiveVenueId(VENUE_A.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'));
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId(`venue-option-${VENUE_B.id}`));

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall B'));
  });

  it('selects All Venues and clears active venue', async () => {
    setActiveVenueId(VENUE_A.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A'));
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    await user.click(screen.getByTestId('venue-option-all'));

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
  });

  it('is keyboard operable with accessible name and current selection (C5.4, FR-013)', async () => {
    setActiveVenueId(VENUE_A.id);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A, VENUE_B]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('venue-switcher-trigger')).toBeInTheDocument());

    const trigger = screen.getByTestId('venue-switcher-trigger');
    expect(trigger).toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall A');

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('venue-switcher-menu')).toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent('Hall B'));
  });

  it('renders server response verbatim without client filtering (C5.5, C5.7)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_B]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    expect(screen.getByRole('option', { name: /Hall B/ })).toBeInTheDocument();
  });

  it('renders nothing when no venues are accessible (C5.6)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }),
    );

    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByTestId('venue-switcher')).not.toBeInTheDocument());
  });

  it('shows dropdown with All Venues for a single venue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([VENUE_A]),
      }),
    );

    const user = userEvent.setup();
    render(<VenueSwitcher />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByTestId('venue-switcher-current')).toHaveTextContent(ALL_VENUES_LABEL),
    );
    await user.click(screen.getByTestId('venue-switcher-trigger'));
    expect(screen.getByRole('option', { name: ALL_VENUES_LABEL })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Hall A/ })).toBeInTheDocument();
  });
});
