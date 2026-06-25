import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventFormPanel } from '@/components/event/EventFormPanel';

describe('EventFormPanel', () => {
  it('validates required fields on create', async () => {
    const user = userEvent.setup();
    render(
      <EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect(screen.getByText('Event title is required.')).toBeInTheDocument();
    expect(screen.getByText('Event date is required.')).toBeInTheDocument();
  });

  it('submits create form with valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Event title'), 'Spring Show');
    await user.type(screen.getByLabelText('Event date'), '2026-05-01');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Spring Show',
        eventDate: '2026-05-01',
        qboTagName: '',
      }),
    );
  });

  it('calls cancel handler', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
