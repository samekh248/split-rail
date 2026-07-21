import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventCard } from '@/components/dashboard/EventCard';
import type { EventCardDto, PermissionsDto } from '@/types/generated-api';
import { EVENT_A } from '../../fixtures/events';

const FULL_PERMISSIONS: PermissionsDto = {
  canViewFinancials: true,
  canLockBudget: true,
  canEditSettlement: true,
  canSignSettlement: true,
  canTriggerQboSync: true,
};

const EVENT_WITH_ALERTS: EventCardDto = {
  eventId: EVENT_A.eventId!,
  venueId: EVENT_A.venueId!,
  title: 'Show A',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  isBudgetLocked: true,
  settlementPdfAvailable: false,
  unmappedCount: 2,
  hasVarianceConcern: true,
};

function openBadgePopover(eventId: string) {
  const stack = screen.getByTestId(`event-card-badge-count-${eventId}`).parentElement;
  if (!stack) {
    throw new Error('Badge stack not found');
  }
  fireEvent.mouseEnter(stack);
}

describe('EventCard theme', () => {
  it('renders with event-card surface class for white-on-cream container styling', () => {
    render(
      <EventCard
        event={EVENT_A}
        permissions={FULL_PERMISSIONS}
        onQuickLink={vi.fn()}
      />,
    );

    const card = screen.getByTestId(`event-card-${EVENT_A.eventId}`);
    expect(card).toHaveClass('event-card');
    expect(card.tagName).toBe('ARTICLE');
  });

  it('renders required action links instead of bottleneck alert chips', () => {
    render(
      <EventCard
        event={EVENT_WITH_ALERTS}
        permissions={FULL_PERMISSIONS}
        onQuickLink={vi.fn()}
      />,
    );

    expect(screen.getByTestId(`event-card-link-signature-${EVENT_A.eventId}`)).toHaveTextContent(
      'Capture Signature',
    );
    expect(
      screen.queryByTestId(`event-card-link-variance-${EVENT_A.eventId}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`event-card-alert-MISSING_SIGNATURE-${EVENT_A.eventId}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`event-card-alert-UNMAPPED_QBO-${EVENT_A.eventId}`),
    ).not.toBeInTheDocument();
  });

  it('keeps variance badge on warning styling without badge-action-required', () => {
    render(
      <EventCard
        event={{
          ...EVENT_WITH_ALERTS,
          hasVarianceConcern: false,
        }}
        permissions={FULL_PERMISSIONS}
        onQuickLink={vi.fn()}
        lineItems={[{ qboActualValue: '40.00', settlementValue: '50.00', variance: '-10.00' }]}
      />,
    );

    openBadgePopover(EVENT_A.eventId!);
    const varianceBadge = screen.getByTestId(`event-card-variance-${EVENT_A.eventId}`);
    expect(varianceBadge).toHaveClass('event-card__variance-badge');
    expect(varianceBadge).not.toHaveClass('badge-action-required');
  });
});
