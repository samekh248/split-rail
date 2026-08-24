import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FestivalCancelConfirm } from '@/components/festival/FestivalCancelConfirm';

describe('FestivalCancelConfirm', () => {
  it('renders nothing when closed', () => {
    render(
      <FestivalCancelConfirm
        eventTitle="Kalispell Roundup"
        open={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('festival-cancel-confirm')).not.toBeInTheDocument();
  });

  it('confirms cancel from the dialog', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <FestivalCancelConfirm
        eventTitle="Kalispell Roundup"
        open
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog', { name: 'Cancel booking?' })).toBeInTheDocument();
    expect(screen.getByText(/deletes the festival from the calendar/)).toBeInTheDocument();

    await user.click(screen.getByTestId('festival-cancel-confirm-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders a custom description when provided', () => {
    render(
      <FestivalCancelConfirm
        eventTitle="Friday Headliner"
        open
        description="Cancel the booking for this show?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Cancel the booking for this show?')).toBeInTheDocument();
    expect(screen.queryByText(/deletes the festival from the calendar/)).not.toBeInTheDocument();
  });

  it('does not confirm when the dialog is dismissed', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <FestivalCancelConfirm
        eventTitle="Kalispell Roundup"
        open
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
