import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteRegionConfirm } from '@/components/venue/DeleteRegionConfirm';

const region = {
  id: 'region-a',
  name: 'West',
  notes: null,
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  venueCount: 0,
};

describe('DeleteRegionConfirm', () => {
  it('confirms deletion', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteRegionConfirm region={region} open onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    expect(screen.getByTestId('delete-region-confirm')).toHaveTextContent('West');
    await user.click(screen.getByTestId('delete-region-confirm-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancels deletion', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteRegionConfirm region={region} open onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows pending and error states', () => {
    render(
      <DeleteRegionConfirm
        region={region}
        open
        isPending
        error="Unable to delete region."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByText('Unable to delete region.')).toBeInTheDocument();
  });
});
