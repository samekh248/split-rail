import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRAND_LOGO_TEXT } from '@/brand/assets';
import { MobileNavDrawer } from '@/components/shell/MobileNavDrawer';
import { getAppPath } from '@/lib/appRoute';
import { createSidebarTestWrapper } from './shellTestUtils';
import { VENUE_A } from '../fixtures/venues';
import { workspaceMemberProfile } from '../utils/mockWorkspaceFetch';

vi.mock('@/hooks/useCanManageEvents', () => ({
  useCanManageEvents: vi.fn(() => true),
}));

import { useCanManageEvents } from '@/hooks/useCanManageEvents';

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open drawer
      </button>
      <MobileNavDrawer open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} />
    </>
  );
}

describe('MobileNavDrawer', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.mocked(useCanManageEvents).mockReturnValue(true);
  });

  it('opens and closes via close button', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, { wrapper: createSidebarTestWrapper() });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();

    await user.click(screen.getByTestId('mobile-nav-close'));
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('shows wordmark in drawer header when open', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, { wrapper: createSidebarTestWrapper() });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));

    const brandWrapper = document.querySelector('.mobile-nav-drawer__brand');
    expect(brandWrapper).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Split-Rail' });
    expect(img).toHaveAttribute('src', BRAND_LOGO_TEXT);
    expect(img).toHaveClass('brand-logo--text');
  });

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, { wrapper: createSidebarTestWrapper() });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await user.click(screen.getByTestId('mobile-nav-backdrop'));
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, { wrapper: createSidebarTestWrapper() });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('closes when a global nav item is selected', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, { wrapper: createSidebarTestWrapper() });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await user.click(screen.getAllByTestId('global-nav-dashboard')[0]!);
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('shows accounting nav when user has financial permission', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, {
      wrapper: createSidebarTestWrapper({}, { venues: [VENUE_A] }),
    });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(screen.getAllByTestId('global-nav-accounting')[0]).toBeInTheDocument();
  });

  it('hides accounting nav without financial permission', async () => {
    vi.mocked(useCanManageEvents).mockReturnValue(false);
    const user = userEvent.setup();
    render(<DrawerHarness />, {
      wrapper: createSidebarTestWrapper(
        {},
        { venues: [VENUE_A], profile: workspaceMemberProfile },
      ),
    });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(screen.queryByTestId('global-nav-accounting')).not.toBeInTheDocument();
  });

  it('navigates to accounting from mobile drawer', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, {
      wrapper: createSidebarTestWrapper({}, { venues: [VENUE_A] }),
    });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await user.click(screen.getAllByTestId('global-nav-accounting')[0]!);
    expect(getAppPath()).toBe('/accounting');
  });
});
