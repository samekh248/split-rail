import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarRail } from '@/components/shell/SidebarRail';
import { useSidebarState } from '@/hooks/useSidebarState';
import { getAppPath } from '@/lib/appRoute';
import { createSidebarTestWrapper } from './shellTestUtils';

function SidebarRailHarness() {
  const sidebar = useSidebarState();
  return (
    <div
      className={`app-shell app-shell--${sidebar.effectiveMode}`}
      data-testid="shell-harness"
      data-effective-mode={sidebar.effectiveMode}
    >
      <SidebarRail sidebar={sidebar} />
    </div>
  );
}

describe('SidebarRail', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function advanceHoverIntent() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
  }

  it('unpins and re-pins navigation via hover overlay', async () => {
    vi.useFakeTimers();
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });

    expect(screen.getByTestId('shell-harness')).toHaveAttribute(
      'data-effective-mode',
      'pinned-expanded',
    );

    fireEvent.click(screen.getByTestId('sidebar-nav-unpin'));
    expect(screen.getByTestId('shell-harness')).toHaveAttribute('data-effective-mode', 'collapsed');
    expect(screen.getByTestId('sidebar-brand')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-nav-pin')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-nav-unpin')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('sidebar-rail'));
    await advanceHoverIntent();
    fireEvent.click(screen.getByTestId('sidebar-nav-pin'));

    expect(screen.getByTestId('shell-harness')).toHaveAttribute(
      'data-effective-mode',
      'pinned-expanded',
    );
  });

  it('shows brand mark when collapsed and nav pin only on hover overlay', async () => {
    vi.useFakeTimers();
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });

    fireEvent.click(screen.getByTestId('sidebar-nav-unpin'));
    expect(screen.getByTestId('sidebar-brand')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-nav-pin')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('sidebar-rail'));
    await advanceHoverIntent();

    expect(screen.getByTestId('sidebar-brand')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Split-Rail' })).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-pin')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-nav-unpin')).not.toBeInTheDocument();
  });

  it('opens hover overlay after intent delay without pinned expand', async () => {
    vi.useFakeTimers();
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });

    fireEvent.click(screen.getByTestId('sidebar-nav-unpin'));
    fireEvent.mouseEnter(screen.getByTestId('sidebar-rail'));

    expect(screen.getByTestId('shell-harness')).toHaveAttribute('data-effective-mode', 'collapsed');

    await advanceHoverIntent();
    expect(screen.getByTestId('shell-harness')).toHaveAttribute(
      'data-effective-mode',
      'hover-overlay',
    );
  });

  it('retracts hover overlay immediately on pointer leave', async () => {
    vi.useFakeTimers();
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });

    fireEvent.click(screen.getByTestId('sidebar-nav-unpin'));
    fireEvent.mouseEnter(screen.getByTestId('sidebar-rail'));
    await advanceHoverIntent();
    fireEvent.mouseLeave(screen.getByTestId('sidebar-rail'));

    expect(screen.getByTestId('shell-harness')).toHaveAttribute('data-effective-mode', 'collapsed');
  });

  it('pins navigation open from hover overlay', async () => {
    vi.useFakeTimers();
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });

    fireEvent.click(screen.getByTestId('sidebar-nav-unpin'));
    fireEvent.mouseEnter(screen.getByTestId('sidebar-rail'));
    await advanceHoverIntent();
    fireEvent.click(screen.getByTestId('sidebar-nav-pin'));

    expect(screen.getByTestId('shell-harness')).toHaveAttribute(
      'data-effective-mode',
      'pinned-expanded',
    );
  });

  it('nav unpin control is keyboard accessible', () => {
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });
    screen.getByTestId('sidebar-nav-unpin').focus();
    expect(screen.getByTestId('sidebar-nav-unpin')).toHaveFocus();
  });

  it('navigates to dashboard when app logo is clicked', () => {
    window.history.pushState({}, '', '/settings/team');
    render(<SidebarRailHarness />, { wrapper: createSidebarTestWrapper() });

    fireEvent.click(screen.getByTestId('sidebar-brand'));
    expect(getAppPath()).toBe('/');
  });
});
