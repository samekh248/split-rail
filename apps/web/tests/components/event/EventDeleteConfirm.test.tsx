import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventDeleteConfirm } from '@/components/event/EventDeleteConfirm';

describe('EventDeleteConfirm', () => {
  it('confirms delete', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <EventDeleteConfirm
        eventTitle="Spring Show"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-delete-confirm-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancels delete', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <EventDeleteConfirm
        eventTitle="Spring Show"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
