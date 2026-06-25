import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteVenueConfirm } from '@/components/venue/DeleteVenueConfirm';

const venue = {
  id: 'ven-1',
  name: 'Hall A',
  organizationId: 'org-1',
  createdAt: '2026-06-01T00:00:00Z',
};

describe('DeleteVenueConfirm', () => {
  it('confirms deletion', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteVenueConfirm venue={venue} open onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByTestId('delete-venue-confirm-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancels deletion', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteVenueConfirm venue={venue} open onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows pending and error states', () => {
    render(
      <DeleteVenueConfirm
        venue={venue}
        open
        isPending
        error="Unable to delete venue."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByText('Unable to delete venue.')).toBeInTheDocument();
  });
});
