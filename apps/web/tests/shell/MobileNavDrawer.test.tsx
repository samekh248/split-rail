import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MobileNavDrawer } from '@/components/shell/MobileNavDrawer';
import { createSidebarTestWrapper } from './shellTestUtils';

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
  it('opens and closes via close button', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />, { wrapper: createSidebarTestWrapper() });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();

    await user.click(screen.getByTestId('mobile-nav-close'));
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
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
});
