import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventCombobox } from '@/components/event/EventCombobox';
import type { EventResponse } from '@/types/generated-api';

const EVENTS: EventResponse[] = [
  {
    eventId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    title: 'Summer Show',
    eventDate: '2026-08-01',
    status: 'PRE_SHOW',
    isBudgetLocked: false,
  },
  {
    eventId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    title: 'Winter Gala',
    eventDate: '2026-12-01',
    status: 'PRE_SHOW',
    isBudgetLocked: false,
  },
];

describe('EventCombobox', () => {
  it('selects an event from the menu', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={EVENTS}
        selectedEventId={EVENTS[0]!.eventId!}
        canManageEvents
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    await user.click(screen.getByTestId(`event-option-${EVENTS[1]!.eventId}`));
    expect(onSelect).toHaveBeenCalledWith(EVENTS[1]!.eventId);
  });

  it('filters events and shows no results state', async () => {
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={EVENTS}
        selectedEventId={EVENTS[0]!.eventId!}
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
        events={EVENTS}
        selectedEventId={EVENTS[0]!.eventId!}
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
