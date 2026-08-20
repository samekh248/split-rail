import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventFormPanel } from '@/components/event/EventFormPanel';

async function setDate(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

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

  it('hides the type picker when the caller cannot create festivals', () => {
    render(<EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByTestId('event-type-picker')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Event title')).toBeInTheDocument();
  });

  it('creates a festival with a multi-day range', async () => {
    const onCreateFestival = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="create"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onCreateFestival={onCreateFestival}
      />,
    );

    await user.click(screen.getByTestId('event-type-festival'));
    await user.type(screen.getByLabelText('Festival name'), 'Kalispell Roundup');
    await user.type(screen.getByLabelText('Start date'), '2026-08-14');
    await setDate('End date', '2026-08-16');

    expect(screen.getByTestId('event-festival-day-count')).toHaveTextContent('3 days');
    expect(screen.queryByLabelText('Accounting tag (optional)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create festival' }));

    await waitFor(() =>
      expect(onCreateFestival).toHaveBeenCalledWith({
        title: 'Kalispell Roundup',
        startDate: '2026-08-14',
        endDate: '2026-08-16',
      }),
    );
  });

  it('blocks a festival range longer than three days', async () => {
    const onCreateFestival = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="create"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onCreateFestival={onCreateFestival}
      />,
    );

    await user.click(screen.getByTestId('event-type-festival'));
    await user.type(screen.getByLabelText('Festival name'), 'Week Long');
    await user.type(screen.getByLabelText('Start date'), '2026-08-14');
    await setDate('End date', '2026-08-20');
    await user.click(screen.getByRole('button', { name: 'Create festival' }));

    expect(screen.getByText(/3 days or fewer/)).toBeInTheDocument();
    expect(onCreateFestival).not.toHaveBeenCalled();
  });

  it('requires a festival name', async () => {
    const onCreateFestival = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="create"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onCreateFestival={onCreateFestival}
      />,
    );

    await user.click(screen.getByTestId('event-type-festival'));
    await user.type(screen.getByLabelText('Start date'), '2026-08-14');
    await user.click(screen.getByRole('button', { name: 'Create festival' }));

    expect(screen.getByText('Festival name is required.')).toBeInTheDocument();
    expect(onCreateFestival).not.toHaveBeenCalled();
  });

  it('keeps the standard event path available after previewing the festival option', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="create"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        onCreateFestival={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-type-festival'));
    await user.click(screen.getByTestId('event-type-standard'));

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

  it('places a Cancel action on the left and the primary submit on the right, with a leading icon, in create mode', () => {
    render(<EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const actions = screen.getByTestId('event-form-panel').querySelector('.event-form-panel__actions')!;
    const buttons = within(actions).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Cancel');
    expect(buttons[1]).toHaveTextContent('Create event');
    expect(buttons[1].querySelector('svg')).toBeInTheDocument();
  });

  it('places a Cancel action on the left and the primary submit on the right, with a leading icon, in edit mode', () => {
    render(
      <EventFormPanel
        mode="edit"
        initialValues={{ title: 'Spring Show', eventDate: '2026-05-01', qboTagName: '' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const actions = screen.getByTestId('event-form-panel').querySelector('.event-form-panel__actions')!;
    const buttons = within(actions).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Cancel');
    expect(buttons[1]).toHaveTextContent('Save changes');
    expect(buttons[1].querySelector('svg')).toBeInTheDocument();
  });

  it('calls onCancel when the action-row Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={onCancel} />);

    const actions = screen.getByTestId('event-form-panel').querySelector('.event-form-panel__actions')!;
    await user.click(within(actions).getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('gives the selected event type a visual indicator beyond the hover-only cue', async () => {
    const user = userEvent.setup();
    render(
      <EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} onCreateFestival={vi.fn()} />,
    );

    const standardOption = screen.getByTestId('event-type-standard').closest('label')!;
    const festivalOption = screen.getByTestId('event-type-festival').closest('label')!;

    expect(standardOption).toHaveClass('event-form-panel__type-option--active');
    expect(festivalOption).not.toHaveClass('event-form-panel__type-option--active');

    await user.click(screen.getByTestId('event-type-festival'));

    expect(festivalOption).toHaveClass('event-form-panel__type-option--active');
    expect(standardOption).not.toHaveClass('event-form-panel__type-option--active');
  });
});
