import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventCombobox } from '@/components/event/EventCombobox';
import { EVENT_A, EVENT_C } from '../../fixtures/events';
import type { EventResponse } from '@/types/generated-api';

const BUDGET_LOCKED_EVENT: EventResponse = {
  eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  venueId: EVENT_A.venueId,
  title: 'Locked Show',
  eventDate: '2026-11-01',
  status: 'PRE_SHOW',
  isBudgetLocked: true,
  qboTagName: '',
};

const SETTLED_EVENT: EventResponse = {
  eventId: '99999999-9999-9999-9999-999999999999',
  venueId: EVENT_A.venueId,
  title: 'Settled Show',
  eventDate: '2026-12-01',
  status: 'SETTLED',
  isBudgetLocked: true,
  qboTagName: '',
};

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

  it('shows Budget locked badge for Pre-Show event with locked budget', () => {
    render(
      <EventCombobox
        events={[BUDGET_LOCKED_EVENT]}
        selectedEventId={BUDGET_LOCKED_EVENT.eventId!}
        canManageEvents={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Budget locked')).toBeInTheDocument();
    expect(screen.queryByText('Planning')).not.toBeInTheDocument();
  });

  it('shows edit and delete for unlocked Pre-Show when user can manage events', async () => {
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[EVENT_A, EVENT_C]}
        selectedEventId={EVENT_A.eventId!}
        canManageEvents
        onSelect={vi.fn()}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    expect(screen.getByTestId(`event-edit-${EVENT_A.eventId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`event-delete-${EVENT_A.eventId}`)).toBeInTheDocument();
  });

  it('shows Budget locked hint and hides delete for budget-locked Pre-Show', async () => {
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[BUDGET_LOCKED_EVENT, EVENT_C]}
        selectedEventId={BUDGET_LOCKED_EVENT.eventId!}
        canManageEvents
        onSelect={vi.fn()}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    expect(screen.getByTestId(`event-edit-${BUDGET_LOCKED_EVENT.eventId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`event-delete-${BUDGET_LOCKED_EVENT.eventId}`)).not.toBeInTheDocument();
    expect(screen.getByText('Budget locked')).toBeInTheDocument();
  });

  it('shows Event locked hint and hides edit/delete for settled events', async () => {
    const user = userEvent.setup();

    render(
      <EventCombobox
        events={[SETTLED_EVENT, EVENT_C]}
        selectedEventId={SETTLED_EVENT.eventId!}
        canManageEvents
        onSelect={vi.fn()}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('event-combobox-trigger'));
    expect(screen.queryByTestId(`event-edit-${SETTLED_EVENT.eventId}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`event-delete-${SETTLED_EVENT.eventId}`)).not.toBeInTheDocument();
    expect(screen.getByText('Event locked')).toBeInTheDocument();
  });
});
