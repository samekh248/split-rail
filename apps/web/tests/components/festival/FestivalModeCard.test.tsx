import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FestivalModeCard } from '@/components/festival/FestivalModeCard';
import type { EventResponse } from '@/types/generated-api';

vi.mock('@/api/festivals', () => ({
  useFestival: () => ({ data: { days: [{ id: 'd1' }, { id: 'd2' }], qboTagName: 'FEST-TAG' } }),
}));

vi.mock('@/api/dashboard', () => ({
  usePinEvent: () => ({ mutate: vi.fn() }),
  useUnpinEvent: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/components/festival/FestivalSetupModal', () => ({
  FestivalSetupModal: () => null,
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
  });
});
