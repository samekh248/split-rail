import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConvertToFestivalAction } from '@/components/festival/ConvertToFestivalAction';
import type { EventResponse } from '@/types/generated-api';

vi.mock('@/components/festival/FestivalSetupModal', () => ({
  FestivalSetupModal: ({ open, mode }: { open: boolean; mode?: string }) =>
    open ? <div data-testid="festival-setup-modal" data-mode={mode ?? 'create'} /> : null,
}));

const standardEvent: EventResponse = {
  eventId: 'evt-standard',
  venueId: 'venue-1',
  title: 'Friday Headliner',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  eventType: 'STANDARD',
};

describe('ConvertToFestivalAction', () => {
  it('is not present as a top-level button before the kebab menu is opened', () => {
    render(<ConvertToFestivalAction venueId="venue-1" event={standardEvent} />);

    expect(screen.queryByTestId('festival-convert-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('festival-convert-menu-trigger')).toBeInTheDocument();
  });

  it('opens FestivalSetupModal when Convert to festival is selected from the kebab menu', async () => {
    const user = userEvent.setup();
    render(<ConvertToFestivalAction venueId="venue-1" event={standardEvent} />);

    await user.click(screen.getByTestId('festival-convert-menu-trigger'));
    await user.click(screen.getByTestId('festival-convert-button'));

    expect(screen.getByTestId('festival-setup-modal')).toBeInTheDocument();
  });

  it('closes the overflow menu on Escape without invoking Convert to festival', async () => {
    const user = userEvent.setup();
    render(<ConvertToFestivalAction venueId="venue-1" event={standardEvent} />);

    await user.click(screen.getByTestId('festival-convert-menu-trigger'));
    expect(screen.getByTestId('festival-convert-button')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('festival-convert-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('festival-setup-modal')).not.toBeInTheDocument();
  });
});
