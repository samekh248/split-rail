import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalNav } from '@/components/shell/GlobalNav';
import { getAppPath } from '@/lib/appRoute';

vi.mock('@/hooks/useCanManageEvents', () => ({
  useCanManageEvents: vi.fn(() => true),
}));

vi.mock('@/venue/useActiveVenue', () => ({
  useActiveVenue: vi.fn(() => ({
    isAllVenuesSelected: false,
    venues: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Hall A' }],
    activateVenueId: vi.fn(),
  })),
}));

import { useCanManageEvents } from '@/hooks/useCanManageEvents';
import { useActiveVenue } from '@/venue/useActiveVenue';

function renderNav() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <GlobalNav />
    </QueryClientProvider>,
  );
}

describe('GlobalNav', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.mocked(useCanManageEvents).mockReturnValue(true);
    vi.mocked(useActiveVenue).mockReturnValue({
      isAllVenuesSelected: false,
      venues: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Hall A' }],
      activateVenueId: vi.fn(),
      activeVenueId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('highlights dashboard on workspace routes', () => {
    window.history.pushState(
      {},
      '',
      '/venues/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/events/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    );
    renderNav();
    expect(screen.getByTestId('global-nav-dashboard')).toHaveClass('global-nav__item--active');
  });

  it('highlights venues on /venues', () => {
    window.history.pushState({}, '', '/venues');
    renderNav();
    expect(screen.getByTestId('global-nav-venues')).toHaveClass('global-nav__item--active');
    expect(screen.getByTestId('global-nav-dashboard')).not.toHaveClass('global-nav__item--active');
  });

  it('navigates to /venues when venues is clicked', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByTestId('global-nav-venues'));
    expect(getAppPath()).toBe('/venues');
  });

  it('highlights dashboard on root route', () => {
    window.history.pushState({}, '', '/');
    renderNav();
    expect(screen.getByTestId('global-nav-dashboard')).toHaveClass('global-nav__item--active');
  });

  it('highlights accounting on /accounting', () => {
    window.history.pushState({}, '', '/accounting');
    renderNav();
    expect(screen.getByTestId('global-nav-accounting')).toHaveClass('global-nav__item--active');
    expect(screen.getByTestId('global-nav-dashboard')).not.toHaveClass('global-nav__item--active');
  });

  it('navigates to /accounting when accounting is clicked', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByTestId('global-nav-accounting'));
    expect(getAppPath()).toBe('/accounting');
  });

  it('exits all-venues when accounting is clicked', async () => {
    const activateVenueId = vi.fn();
    vi.mocked(useActiveVenue).mockReturnValue({
      isAllVenuesSelected: true,
      venues: [{ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Hall B' }],
      activateVenueId,
      activeVenueId: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByTestId('global-nav-accounting'));
    expect(activateVenueId).toHaveBeenCalledWith('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    expect(getAppPath()).toBe('/accounting');
  });

  it('hides accounting without financial permission', () => {
    vi.mocked(useCanManageEvents).mockReturnValue(false);
    renderNav();
    expect(screen.queryByTestId('global-nav-accounting')).not.toBeInTheDocument();
  });

  it('navigates to booking when booking item is clicked', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByTestId('global-nav-booking'));
    expect(getAppPath()).toBe('/booking');
  });

  it('does not show coming soon on enabled booking item', () => {
    renderNav();
    const booking = screen.getByTestId('global-nav-booking');
    expect(booking).not.toHaveTextContent('Coming soon');
  });

  it('does not show coming soon on accounting when financial permission is granted', () => {
    renderNav();
    const accounting = screen.getByTestId('global-nav-accounting');
    expect(accounting).not.toHaveTextContent('Coming soon');
  });
});
