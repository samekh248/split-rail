import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FestivalModeCard } from '@/components/festival/FestivalModeCard';
import type { EventResponse } from '@/types/generated-api';

const mockUpdateEvent = { mutateAsync: vi.fn(), isPending: false };
const mockDeleteEvent = { mutateAsync: vi.fn(), isPending: false };

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
  });
  it('renders nothing for a standard event without manage permission', () => {
    const { container } = render(
      <FestivalModeCard venueId="venue-1" event={standardEvent} canManage={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a frozen standard event even with manage permission', () => {
    const { container } = render(
      <FestivalModeCard venueId="venue-1" event={frozenEvent} canManage />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the convert action on the trailing edge of the prompt', () => {
    render(<FestivalModeCard venueId="venue-1" event={standardEvent} canManage />);

    const card = screen.getByTestId('festival-mode-card');
    expect(card).toHaveClass('festival-mode-card');
    expect(card.className.split(' ')).toEqual(['festival-mode-card']);

    const convert = screen.getByTestId('festival-convert-button');
    expect(convert.closest('.festival-mode-card__prompt')).toHaveClass('section-header');
    expect(convert.closest('.section-header__actions')).toBeInTheDocument();
  });

  it('shows the active festival card without a competing outer layout class', () => {
    render(<FestivalModeCard venueId="venue-1" event={festivalEvent} canManage />);

    const card = screen.getByTestId('festival-mode-card');
    expect(card).toHaveClass('festival-mode-card');
    expect(card).toHaveClass('festival-mode-card--active');
    expect(card).not.toHaveClass('event-workspace');
    expect(screen.getByTestId('festival-date-range')).toHaveTextContent('Aug 1–3, 2026');
    expect(screen.getByTestId('stage-manager-stub')).toBeInTheDocument();
    expect(screen.getByTestId('festival-pin-evt-festival')).toHaveAttribute('aria-label', 'Pin festival');
    expect(screen.getByTestId('festival-edit-button').closest('.festival-mode-card__heading')).toHaveClass(
      'section-header',
    );
    expect(screen.getByTestId('festival-edit-button').closest('.section-header__actions')).toBeInTheDocument();
    expect(screen.queryByTestId('festival-actions-menu')).not.toBeInTheDocument();
  });

  it('keeps itinerary and master ledger in the section header actions', () => {
    render(<FestivalModeCard venueId="venue-1" event={festivalEvent} canManage />);

    const actions = screen.getByTestId('festival-edit-button').closest('.section-header__actions');
    expect(actions).toContainElement(screen.getByTestId('festival-itinerary-link'));
    expect(actions).toContainElement(screen.getByTestId('festival-ledger-link'));
    expect(screen.getByTestId('festival-itinerary-link')).toHaveClass('festival-mode-card__link');
    expect(screen.getByTestId('festival-ledger-link')).toHaveClass('festival-mode-card__link');
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
