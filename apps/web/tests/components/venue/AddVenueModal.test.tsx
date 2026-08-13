import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddVenueModal } from '@/components/venue/AddVenueModal';
import { VENUE_NAME_MAX_LENGTH } from '@/auth/validation';

const mockCreate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/venues', () => ({
  useCreateVenue: () => mockCreate,
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('AddVenueModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mutateAsync.mockResolvedValue({
      id: 'new-venue',
      name: 'The Roxy',
      organizationId: 'org-1',
      createdAt: '2026-06-01T00:00:00Z',
      regionId: 'region-a',
    });
  });

  it('renders with the fixed region and no region selector', () => {
    render(
      <AddVenueModal regionId="region-a" regionName="West" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText(/West/)).toBeInTheDocument();
    expect(screen.queryByTestId('venue-region-field')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Region')).not.toBeInTheDocument();
  });

  it('creates a venue tied to the fixed region on submit', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <AddVenueModal
        regionId="region-a"
        regionName="West"
        open
        onClose={onClose}
        onCreated={onCreated}
      />,
      { wrapper: Wrapper },
    );

    await user.type(screen.getByLabelText('Venue name'), 'The Roxy');
    await user.click(screen.getByTestId('venue-add-save'));

    expect(mockCreate.mutateAsync).toHaveBeenCalledWith({ name: 'The Roxy', regionId: 'region-a' });
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation for empty name without creating', async () => {
    const user = userEvent.setup();
    render(
      <AddVenueModal regionId="region-a" regionName="West" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('venue-add-save'));

    expect(await screen.findByText('Venue name is required.')).toBeInTheDocument();
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows validation for over-max-length name without creating', async () => {
    const user = userEvent.setup();
    render(
      <AddVenueModal regionId="region-a" regionName="West" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.type(screen.getByLabelText('Venue name'), 'x'.repeat(VENUE_NAME_MAX_LENGTH + 1));
    await user.click(screen.getByTestId('venue-add-save'));

    expect(
      await screen.findByText(`Venue name must be ${VENUE_NAME_MAX_LENGTH} characters or fewer.`),
    ).toBeInTheDocument();
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  });

  it('maps server errors', async () => {
    mockCreate.mutateAsync.mockRejectedValue(new Error('403: Forbidden'));
    const user = userEvent.setup();
    render(
      <AddVenueModal regionId="region-a" regionName="West" open onClose={vi.fn()} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.type(screen.getByLabelText('Venue name'), 'The Roxy');
    await user.click(screen.getByTestId('venue-add-save'));

    expect(
      await screen.findByText('You do not have permission to add venues.'),
    ).toBeInTheDocument();
  });

  it('cancel/close creates nothing and closes without navigating', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AddVenueModal regionId="region-a" regionName="West" open onClose={onClose} onCreated={vi.fn()} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  });
});
