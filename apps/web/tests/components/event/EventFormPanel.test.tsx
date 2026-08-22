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
        doorsTime: '',
        showStartTime: '',
        supportLineup: '',
        notes: '',
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
        doorsTime: '',
        showStartTime: '',
        supportLineup: '',
        notes: '',
      }),
    );
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

  const editValues = {
    title: 'Spring Show',
    eventDate: '2026-05-01',
    qboTagName: '',
    doorsTime: '19:00',
    showStartTime: '20:00',
    supportLineup: 'Openers: The Support Act',
    notes: 'Line one\nLine two',
  };

  it('does not offer show-detail fields in create mode', () => {
    render(<EventFormPanel mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByLabelText('Doors time')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Show start time')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Supporting lineup')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument();
  });

  it('renders doors and show start times in edit mode on a confirmed placement', () => {
    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="CONFIRMED"
        initialValues={editValues}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Doors time')).toHaveValue('19:00');
    expect(screen.getByLabelText('Show start time')).toHaveValue('20:00');
  });

  it('omits the show-start-time field in edit mode on a hold placement', () => {
    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="HOLD_1"
        initialValues={editValues}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Doors time')).toBeInTheDocument();
    expect(screen.queryByLabelText('Show start time')).not.toBeInTheDocument();
  });

  it('pre-fills supporting lineup and notes in edit mode', () => {
    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="CONFIRMED"
        initialValues={editValues}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Supporting lineup')).toHaveValue('Openers: The Support Act');
    expect(screen.getByLabelText('Notes')).toHaveValue('Line one\nLine two');
  });

  it('submits retained show start time when saving a hold placement without rendering the field', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="HOLD_1"
        initialValues={editValues}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Show start time')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ showStartTime: '20:00' })),
    );
  });

  it('submits lineup without artist-relationship fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="CONFIRMED"
        initialValues={editValues}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({
          artists: expect.anything(),
          eventArtists: expect.anything(),
        }),
      ),
    );
  });

  it('shows a length-limit message before saving when notes exceed the accepted length', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="CONFIRMED"
        initialValues={{ ...editValues, notes: 'a'.repeat(2001) }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Notes cannot exceed 2000 characters.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('surfaces a server conflict message and keeps the submitted times after a rejected save', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('Show start time (18:00) cannot be earlier than doors time (19:00).'));
    const user = userEvent.setup();

    render(
      <EventFormPanel
        mode="edit"
        bookingPlacementStatus="CONFIRMED"
        initialValues={editValues}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const showStartInput = screen.getByLabelText('Show start time');
    await user.clear(showStartInput);
    await user.type(showStartInput, '18:00');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('Show start time (18:00) cannot be earlier than doors time (19:00).'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Show start time')).toHaveValue('18:00');
  });
});
