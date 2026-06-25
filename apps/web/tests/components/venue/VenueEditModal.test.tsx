import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VenueEditModal } from '@/components/venue/VenueEditModal';
import { VENUE_NAME_MAX_LENGTH } from '@/auth/validation';

const mockUpdate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/venues', () => ({
  useUpdateVenue: () => mockUpdate,
}));

vi.mock('@/api/regions', () => ({
  useRegions: () => ({ data: [] }),
}));

const venue = {
  id: 'ven-1',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
};

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('VenueEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mutateAsync.mockResolvedValue({ ...venue, name: 'Hall A Updated' });
  });

  it('saves a valid venue name', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <VenueEditModal venue={venue} open onClose={onClose} onSaved={onSaved} />,
      { wrapper: Wrapper },
    );

    await user.clear(screen.getByLabelText('Venue name'));
    await user.type(screen.getByLabelText('Venue name'), 'Hall A Updated');
    await user.click(screen.getByTestId('venue-edit-save'));

    expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({ name: 'Hall A Updated', regionId: null });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation for empty name', async () => {
    const user = userEvent.setup();

    render(
      <VenueEditModal venue={venue} open onClose={vi.fn()} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.clear(screen.getByLabelText('Venue name'));
    await user.click(screen.getByTestId('venue-edit-save'));

    expect(await screen.findByText('Venue name is required.')).toBeInTheDocument();
    expect(mockUpdate.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows validation for over-max-length name', async () => {
    const user = userEvent.setup();

    render(
      <VenueEditModal venue={venue} open onClose={vi.fn()} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.clear(screen.getByLabelText('Venue name'));
    await user.type(screen.getByLabelText('Venue name'), 'x'.repeat(VENUE_NAME_MAX_LENGTH + 1));
    await user.click(screen.getByTestId('venue-edit-save'));

    expect(
      await screen.findByText(`Venue name must be ${VENUE_NAME_MAX_LENGTH} characters or fewer.`),
    ).toBeInTheDocument();
    expect(mockUpdate.mutateAsync).not.toHaveBeenCalled();
  });

  it('maps server errors', async () => {
    mockUpdate.mutateAsync.mockRejectedValue(new Error('403: Forbidden'));
    const user = userEvent.setup();

    render(
      <VenueEditModal venue={venue} open onClose={vi.fn()} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('venue-edit-save'));

    expect(
      await screen.findByText('You do not have permission to update this venue.'),
    ).toBeInTheDocument();
  });

  it('cancels editing', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <VenueEditModal venue={venue} open onClose={onClose} onSaved={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
