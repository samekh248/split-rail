import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalNav } from '@/components/shell/GlobalNav';
import { getAppPath } from '@/lib/appRoute';

describe('GlobalNav', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('highlights dashboard on workspace routes', () => {
    render(<GlobalNav />);
    expect(screen.getByTestId('global-nav-dashboard')).toHaveClass('global-nav__item--active');
  });

  it('highlights dashboard on create venue route', () => {
    window.history.pushState({}, '', '/venues/new');
    render(<GlobalNav />);
    expect(screen.getByTestId('global-nav-dashboard')).toHaveClass('global-nav__item--active');
  });

  it('shows no active item on settings routes', () => {
    window.history.pushState({}, '', '/settings/team');
    render(<GlobalNav />);
    expect(screen.getByTestId('global-nav-dashboard')).not.toHaveClass('global-nav__item--active');
  });

  it('does not navigate when disabled placeholders are clicked', async () => {
    const user = userEvent.setup();
    render(<GlobalNav />);

    await user.click(screen.getByTestId('global-nav-booking'));
    expect(getAppPath()).toBe('/');

    await user.click(screen.getByTestId('global-nav-accounting'));
    expect(getAppPath()).toBe('/');
  });

  it('shows coming soon labels on disabled items', () => {
    render(<GlobalNav />);
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
  });
});
