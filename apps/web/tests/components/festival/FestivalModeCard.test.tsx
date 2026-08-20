import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FestivalModeCard } from '@/components/festival/FestivalModeCard';
import type { EventResponse } from '@/types/generated-api';
import { DEFAULT_DATE_DISPLAY_FORMAT, setDateDisplayFormat } from '@/lib/dateDisplayFormat';

const { mockUpdateEvent, mockDeleteEvent, copyTextToClipboard } = vi.hoisted(() => ({
  mockUpdateEvent: { mutateAsync: vi.fn(), isPending: false },
  mockDeleteEvent: { mutateAsync: vi.fn(), isPending: false },
  copyTextToClipboard: vi.fn(),
}));

vi.mock('@/api/festivals', () => ({
  useFestival: () => ({ data: { days: [{ id: 'd1' }, { id: 'd2' }], qboTagName: 'FEST-TAG' } }),
}));

vi.mock('@/api/dashboard', () => ({
  usePinEvent: () => ({ mutate: vi.fn() }),
  useUnpinEvent: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/api/events', () => ({
  useUpdateEvent: () => mockUpdateEvent,
  useDeleteEvent: () => mockDeleteEvent,
}));

vi.mock('@/components/festival/FestivalSetupModal', () => ({
  FestivalSetupModal: ({
    open,
    mode,
  }: {
    open: boolean;
    mode?: string;
  }) => (open ? <div data-testid="festival-setup-modal" data-mode={mode ?? 'create'} /> : null),
}));

vi.mock('@/components/festival/StageManagerPanel', () => ({
  StageManagerPanel: () => <div data-testid="stage-manager-stub" />,
}));

vi.mock('@/lib/festivalItineraryRoute', () => ({
  navigateToFestivalItinerary: vi.fn(),
}));

vi.mock('@/lib/festivalLedgerRoute', () => ({
  navigateToFestivalLedger: vi.fn(),
}));

vi.mock('@/lib/copyToClipboard', () => ({
  copyTextToClipboard: (...args: unknown[]) => copyTextToClipboard(...args),
}));

const standardEvent: EventResponse = {
  eventId: 'evt-standard',
  venueId: 'venue-1',
  title: 'Friday Headliner',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  eventType: 'STANDARD',
};

const frozenEvent: EventResponse = {
  ...standardEvent,
  status: 'SETTLED',
};

const festivalEvent: EventResponse = {
  ...standardEvent,
  eventId: 'evt-festival',
  eventType: 'FESTIVAL',
  endDate: '2026-08-03',
  qboTagName: 'EVENT-TAG',
};

describe('FestivalModeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDateDisplayFormat(DEFAULT_DATE_DISPLAY_FORMAT);
    copyTextToClipboard.mockResolvedValue(true);
  });
  it('renders nothing for a standard event, regardless of permission or status', () => {
    const { container: withoutManage } = render(
      <FestivalModeCard venueId="venue-1" event={standardEvent} canManage={false} />,
    );
    expect(withoutManage).toBeEmptyDOMElement();

    const { container: frozenWithManage } = render(
      <FestivalModeCard venueId="venue-1" event={frozenEvent} canManage />,
    );
    expect(frozenWithManage).toBeEmptyDOMElement();
  });

  it('shows the active festival card without a competing outer layout class', () => {
    render(<FestivalModeCard venueId="venue-1" event={festivalEvent} canManage />);

    const card = screen.getByTestId('festival-mode-card');
    expect(card).toHaveClass('festival-mode-card');
    expect(card).toHaveClass('festival-mode-card--active');
    expect(card).not.toHaveClass('event-workspace');
    expect(screen.getByTestId('festival-event-title')).toHaveTextContent('Friday Headliner');
    const meta = screen.getByTestId('festival-event-meta');
    expect(meta).toHaveTextContent('PRE-SHOW');
    expect(meta).toContainElement(screen.getByTestId('festival-pin-evt-festival'));
    expect(screen.getByTestId('festival-pin-evt-festival')).toHaveAttribute('aria-label', 'Pin festival');
    expect(screen.getByTestId('festival-pin-evt-festival')).toHaveClass('event-card__pin');
    expect(screen.getByTestId('festival-date-range')).toHaveTextContent('08/01/2026 – 08/03/2026');
    expect(screen.getByTestId('festival-master-tag')).toHaveTextContent('FEST-TAG');
    expect(screen.getByTestId('festival-master-tag-copy')).toBeInTheDocument();
    expect(screen.getByTestId('stage-manager-stub')).toBeInTheDocument();
    expect(screen.getByTestId('festival-edit-button').closest('.festival-mode-card__heading')).toHaveClass(
      'section-header',
    );
    expect(screen.getByTestId('festival-edit-button').closest('.section-header__actions')).toBeInTheDocument();
    expect(screen.queryByTestId('festival-actions-menu')).not.toBeInTheDocument();
  });

  it('shows budget locked in the header meta when applicable', () => {
    render(
      <FestivalModeCard
        venueId="venue-1"
        event={{ ...festivalEvent, isBudgetLocked: true }}
        canManage
      />,
    );

    expect(screen.getByTestId('festival-event-meta')).toHaveTextContent('PRE-SHOW · Budget locked');
  });

  it('copies the QuickBooks tag to the clipboard when clicked', async () => {
    const user = userEvent.setup();
    render(<FestivalModeCard venueId="venue-1" event={festivalEvent} canManage />);

    await user.click(screen.getByTestId('festival-master-tag-copy'));

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith('FEST-TAG');
    });
    expect(screen.getByTestId('festival-master-tag-copy')).toHaveAttribute(
      'aria-label',
      'Copied QuickBooks tag',
    );
  });

  it('keeps itinerary and master ledger in the section header actions', () => {
    render(<FestivalModeCard venueId="venue-1" event={festivalEvent} canManage />);

    const actions = screen.getByTestId('festival-edit-button').closest('.section-header__actions');
    expect(actions).toContainElement(screen.getByTestId('festival-itinerary-link'));
    expect(actions).toContainElement(screen.getByTestId('festival-ledger-link'));
    expect(actions).not.toContainElement(screen.getByTestId('festival-pin-evt-festival'));
    expect(screen.getByTestId('festival-itinerary-link')).toHaveClass('btn-secondary');
    expect(screen.getByTestId('festival-ledger-link')).toHaveClass('btn-secondary');
    expect(screen.queryByRole('navigation', { name: 'Festival views' })).not.toBeInTheDocument();
  });

  it('opens the edit-festival modal from the card action', async () => {
    const user = userEvent.setup();
    render(<FestivalModeCard venueId="venue-1" event={festivalEvent} canManage />);

    expect(screen.queryByTestId('festival-setup-modal')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('festival-edit-button'));
    expect(screen.getByTestId('festival-setup-modal')).toHaveAttribute('data-mode', 'edit');
  });

  it('opens the edit-festival modal when the workspace requests it', () => {
    render(
      <FestivalModeCard
        venueId="venue-1"
        event={festivalEvent}
        canManage
        editRequestedEventId="evt-festival"
      />,
    );

    expect(screen.getByTestId('festival-setup-modal')).toHaveAttribute('data-mode', 'edit');
  });

  it('hides edit and cancel on a frozen festival', () => {
    render(
      <FestivalModeCard
        venueId="venue-1"
        event={{ ...festivalEvent, status: 'SETTLED' }}
        canManage
        canManageEvents
      />,
    );

    expect(screen.getByTestId('festival-mode-card')).toBeInTheDocument();
    expect(screen.queryByTestId('festival-edit-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('festival-actions-menu')).not.toBeInTheDocument();
  });

  it('asks for confirmation before cancelling a festival booking', async () => {
    mockUpdateEvent.mutateAsync.mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <FestivalModeCard venueId="venue-1" event={festivalEvent} canManage canManageEvents />,
    );

    await user.click(screen.getByTestId('festival-actions-menu-trigger'));
    await user.click(screen.getByTestId('festival-cancel-booking'));
    expect(screen.getByTestId('festival-cancel-confirm')).toBeInTheDocument();
    expect(mockUpdateEvent.mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('festival-cancel-confirm-button'));
    await waitFor(() => {
      expect(mockUpdateEvent.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ bookingPlacementStatus: 'CANCELLED' }),
      );
    });
  });

  it('does not cancel the booking when the confirmation is dismissed', async () => {
    const user = userEvent.setup();
    render(
      <FestivalModeCard venueId="venue-1" event={festivalEvent} canManage canManageEvents />,
    );

    await user.click(screen.getByTestId('festival-actions-menu-trigger'));
    await user.click(screen.getByTestId('festival-cancel-booking'));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('festival-cancel-confirm')).not.toBeInTheDocument();
    expect(mockUpdateEvent.mutateAsync).not.toHaveBeenCalled();
    expect(mockDeleteEvent.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows cancel booking inside the kebab menu when permitted', async () => {
    const user = userEvent.setup();
    render(
      <FestivalModeCard venueId="venue-1" event={festivalEvent} canManage canManageEvents />,
    );

    expect(screen.queryByTestId('festival-cancel-booking')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('festival-actions-menu-trigger'));
    expect(screen.getByTestId('festival-cancel-booking')).toHaveTextContent('Cancel booking');
  });
});
