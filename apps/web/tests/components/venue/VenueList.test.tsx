import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VenueList } from '@/components/venue/VenueList';

const venues = [
  {
    id: 'ven-1',
    name: 'Hall A',
    organizationId: 'org-1',
    createdAt: '2026-06-01T00:00:00Z',
  },
];

describe('VenueList', () => {
  it('renders venue rows', () => {
    render(
      <VenueList venues={venues} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByTestId('venue-list-table')).toBeInTheDocument();
    expect(screen.getByText('Hall A')).toBeInTheDocument();
  });

  it('shows actions when user can manage venues', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <VenueList venues={venues} canManage onEdit={onEdit} onDelete={onDelete} />,
    );

    await user.click(screen.getByTestId('edit-venue-ven-1'));
    expect(onEdit).toHaveBeenCalledWith(venues[0]);

    await user.click(screen.getByTestId('delete-venue-ven-1'));
    expect(onDelete).toHaveBeenCalledWith(venues[0]);
  });

  it('hides actions for read-only users', () => {
    render(
      <VenueList venues={venues} canManage={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.queryByTestId('edit-venue-ven-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-venue-ven-1')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <VenueList venues={[]} isLoading onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('Loading venues…')).toBeInTheDocument();
  });

  it('shows error state with retry', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <VenueList venues={[]} isError onRetry={onRetry} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows empty list message', () => {
    render(
      <VenueList venues={[]} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('No venues found.')).toBeInTheDocument();
  });
});
