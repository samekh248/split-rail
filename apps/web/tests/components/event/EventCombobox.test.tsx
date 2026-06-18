import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventCombobox } from '@/components/event/EventCombobox';
import { EVENT_A, EVENT_C } from '../../fixtures/events';

describe('EventCombobox', () => {
  it('renders provided events with title and date visible', async () => {
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[EVENT_A, EVENT_C]}
        selectedEventId={EVENT_A.eventId!}
        canManageEvents
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    expect(screen.getByTestId(`event-option-${EVENT_A.eventId}`)).toHaveTextContent('Show A');
    expect(screen.getByTestId(`event-option-${EVENT_A.eventId}`)).toHaveTextContent('2026-08-01');
    expect(screen.getByTestId(`event-option-${EVENT_C.eventId}`)).toHaveTextContent('Show C');
  });

  it('only lists events passed in props without injecting extras', () => {
    render(
      <EventCombobox
        events={[EVENT_A]}
        selectedEventId={EVENT_A.eventId!}
        canManageEvents={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId('event-combobox-current')).toHaveTextContent('Show A');
    expect(screen.queryByTestId(`event-option-${EVENT_C.eventId}`)).not.toBeInTheDocument();
    expect(screen.queryByText('Show C')).not.toBeInTheDocument();
  });

  it('selects an event from the menu', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[EVENT_A, EVENT_C]}
        selectedEventId={EVENT_A.eventId!}
        canManageEvents
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId(`event-option-${EVENT_C.eventId}`));
    expect(onSelect).toHaveBeenCalledWith(EVENT_C.eventId);
  });

  it('filters events and shows no results state', async () => {
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[EVENT_A, EVENT_C]}
        selectedEventId={EVENT_A.eventId!}
        canManageEvents={false}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    await user.type(screen.getByTestId('event-combobox-filter'), 'zzzzz');
    expect(screen.getByTestId('event-combobox-no-results')).toBeInTheDocument();
  });

  it('shows create action when permitted', async () => {
    const onCreateClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[EVENT_A, EVENT_C]}
        selectedEventId={EVENT_A.eventId!}
        canManageEvents
        onSelect={vi.fn()}
        onCreateClick={onCreateClick}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId('event-combobox-create'));
    expect(onCreateClick).toHaveBeenCalled();
  });
});
