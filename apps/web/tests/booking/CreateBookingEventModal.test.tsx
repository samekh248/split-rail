import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateBookingEventModal } from '@/components/booking/CreateBookingEventModal';
import type { VenueResponse } from '@/types/generated-api';

const createEventMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockCreateEvent = { mutateAsync: createEventMutateAsync, isPending: false };

vi.mock('@/api/events', () => ({
  useCreateEvent: () => mockCreateEvent,
}));

const venues: VenueResponse[] = [
  { id: 'venue-1', name: 'Main Room' },
  { id: 'venue-2', name: 'Side Room' },
];

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderModal(overrides: Partial<Parameters<typeof CreateBookingEventModal>[0]> = {}) {
  return render(
    <CreateBookingEventModal
      open
      venues={venues}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      {...overrides}
    />,
    { wrapper: Wrapper },
  );
}

describe('CreateBookingEventModal', () => {
  beforeEach(() => {
    createEventMutateAsync.mockReset().mockResolvedValue(undefined);
  });

  it('places a dismiss action on the left and the primary save action on the right, with a leading icon on save', () => {
    renderModal();

    const buttons = screen.getAllByRole('button', { name: /cancel|save/i });
    expect(buttons[0]).toHaveTextContent(/cancel/i);
    expect(buttons[0]).toHaveClass('team-modal__cancel');
    expect(buttons[1]).toHaveTextContent(/save/i);
    expect(buttons[1]).toHaveClass('team-modal__save');
    expect(buttons[1].querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClose when the dismiss action is clicked without submitting', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    screen.getByRole('button', { name: /cancel/i }).click();

    expect(onClose).toHaveBeenCalled();
    expect(mockCreateEvent.mutateAsync).not.toHaveBeenCalled();
  });

  it('uses the shared dropdown for venue selection', () => {
    renderModal();

    expect(screen.getByLabelText('Venue')).toHaveClass('select-field__trigger');
    expect(document.querySelector('select')).not.toBeInTheDocument();
  });

  it('submits the form and calls onCreated/onClose on success', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onClose = vi.fn();
    renderModal({ onCreated, onClose });

    await user.type(screen.getByLabelText('Date'), '2026-09-01');
    await user.type(screen.getByLabelText('Title'), 'New Show');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(createEventMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Show', bookingPlacementStatus: 'CONFIRMED' }),
    );
    expect(onCreated).toHaveBeenCalledWith('2026-09-01');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a booking conflict message on a 409 error without closing', async () => {
    createEventMutateAsync.mockRejectedValueOnce(new Error('409 Conflict'));
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await user.type(screen.getByLabelText('Title'), 'New Show');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Booking conflict on the selected date.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
