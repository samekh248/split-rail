import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventCard } from '@/components/dashboard/EventCard';
import {
  clearAllPinnedEvents,
  isEventPinned,
  setEventPinned,
} from '@/lib/pinnedEventStorage';
import type { EventResponse, LineItemDto, PermissionsDto } from '@/types/generated-api';
import { EVENT_A } from '../../fixtures/events';

const FULL_PERMISSIONS: PermissionsDto = {
  canViewFinancials: true,
  canLockBudget: true,
  canEditSettlement: true,
  canSignSettlement: true,
  canTriggerQboSync: true,
};

function futureDate(): string {
  return '2099-01-15';
}

function pastDate(): string {
  return '2020-01-15';
}

function renderCard(
  event: EventResponse,
  permissions: PermissionsDto = FULL_PERMISSIONS,
  extra?: {
    lineItems?: LineItemDto[];
    isPinned?: boolean;
    onPinToggle?: () => void;
    compact?: boolean;
    showProgressBar?: boolean;
  },
) {
  const onQuickLink = vi.fn();
  render(
    <EventCard
      event={event}
      permissions={permissions}
      onQuickLink={onQuickLink}
      lineItems={extra?.lineItems}
      isPinned={extra?.isPinned}
      onPinToggle={extra?.onPinToggle}
      compact={extra?.compact}
      showProgressBar={extra?.showProgressBar}
    />,
  );
  return { onQuickLink };
}

function openBadgePopover(eventId: string) {
  const stack = screen.getByTestId(`event-card-badge-count-${eventId}`).parentElement;
  if (!stack) {
    throw new Error('Badge stack not found');
  }
  fireEvent.mouseEnter(stack);
}

describe('EventCard', () => {
  beforeEach(() => {
    clearAllPinnedEvents();
  });

  describe('US1 — event summary', () => {
    it('renders title, formatted date, and booking preview badge with tooltip', () => {
      renderCard(EVENT_A);
      expect(screen.getByText('Show A')).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-date-${EVENT_A.eventId}`)).toHaveTextContent('Aug 1, 2026');
      const badge = screen.getByTestId(`event-card-booking-${EVENT_A.eventId}`);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('title', expect.stringContaining('Booking placement status'));
      expect(badge).toHaveClass('event-card__booking-badge--confirmed');
    });

    it('applies booking status colors for hold placements', () => {
      renderCard({ ...EVENT_A, bookingPlacementStatus: 'HOLD_2' });
      const badge = screen.getByTestId(`event-card-booking-${EVENT_A.eventId}`);
      expect(badge).toHaveClass('event-card__booking-badge--hold-2');
    });

    it('shows placeholders when title and date are missing', () => {
      renderCard({ ...EVENT_A, title: null, eventDate: null });
      expect(screen.getByText('Untitled event')).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-date-${EVENT_A.eventId}`)).toHaveTextContent('Date TBD');
    });

    it('shows Date TBD for malformed event date', () => {
      renderCard({ ...EVENT_A, eventDate: 'not-a-date' });
      expect(screen.getByTestId(`event-card-date-${EVENT_A.eventId}`)).toHaveTextContent('Date TBD');
    });

    it('renders lifecycle progress bar on dashboard event cards as the last child', () => {
      renderCard(
        {
          ...EVENT_A,
          status: 'PRE_SHOW',
          isBudgetLocked: false,
          eventDate: futureDate(),
          bookingPlacementStatus: 'CONFIRMED',
        },
        FULL_PERMISSIONS,
        { showProgressBar: true },
      );

      const card = screen.getByTestId(`event-card-${EVENT_A.eventId}`);
      const progressBar = screen.getByTestId(`event-card-progress-${EVENT_A.eventId}`);
      expect(progressBar).toBeInTheDocument();
      expect(card.lastElementChild).toBe(progressBar);
    });

    it('hides lifecycle progress bar when showProgressBar is not enabled', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: false,
        eventDate: futureDate(),
        bookingPlacementStatus: 'CONFIRMED',
        isPinned: true,
      });

      expect(screen.queryByTestId(`event-card-progress-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows progress bar when quick links are permission-filtered', () => {
      renderCard(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: true, eventDate: futureDate() },
        { canViewFinancials: true, canEditSettlement: false, canSignSettlement: false },
        { showProgressBar: true },
      );
      expect(screen.getByTestId(`event-card-progress-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-link-workspace-${EVENT_A.eventId}`)).toBeInTheDocument();
    });
  });

  describe('US2 — quick links', () => {
    it('shows Pre-Show quick links', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: false,
        eventDate: futureDate(),
      });
      expect(screen.getByTestId(`event-card-link-deal-${EVENT_A.eventId}`)).toHaveTextContent(
        'Edit Deal Builder',
      );
      expect(screen.getByTestId(`event-card-link-lock-budget-${EVENT_A.eventId}`)).toHaveTextContent(
        'Lock Budget',
      );
    });

    it('renders phase quick links via deriveLifecyclePhase fallback', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: false,
        eventDate: futureDate(),
        hasVarianceConcern: false,
        unmappedCount: 0,
      });
      expect(screen.getByTestId(`event-card-link-deal-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('shows Night Of quick links when no action bottlenecks are present', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
        settlementPdfAvailable: true,
        eventDate: futureDate(),
      });
      expect(screen.getByTestId(`event-card-link-settlement-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-link-signature-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('shows only Capture Signature when missing signature is the bottleneck', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
        settlementPdfAvailable: false,
        eventDate: futureDate(),
      });
      expect(screen.getByTestId(`event-card-link-signature-${EVENT_A.eventId}`)).toHaveTextContent(
        'Capture Signature',
      );
      expect(
        screen.queryByTestId(`event-card-link-settlement-${EVENT_A.eventId}`),
      ).not.toBeInTheDocument();
    });

    it('shows Post-Show quick links', () => {
      renderCard({
        ...EVENT_A,
        status: 'SETTLED',
        isBudgetLocked: true,
        eventDate: pastDate(),
      });
      expect(screen.getByTestId(`event-card-link-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(
        screen.queryByTestId(`event-card-link-sync-${EVENT_A.eventId}`),
      ).not.toBeInTheDocument();
    });

    it('shows Open workspace fallback for unknown phase', () => {
      renderCard({ ...EVENT_A, status: 'INVALID', eventDate: futureDate() });
      expect(screen.getByTestId(`event-card-link-workspace-${EVENT_A.eventId}`)).toHaveTextContent(
        'Open workspace',
      );
    });

    it('invokes onQuickLink with correct focus payloads', () => {
      const { onQuickLink } = renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
        settlementPdfAvailable: true,
        eventDate: futureDate(),
      });

      fireEvent.click(screen.getByTestId(`event-card-link-settlement-${EVENT_A.eventId}`));
      expect(onQuickLink).toHaveBeenCalledWith(EVENT_A.venueId, EVENT_A.eventId, 'settlement');

      fireEvent.click(screen.getByTestId(`event-card-link-signature-${EVENT_A.eventId}`));
      expect(onQuickLink).toHaveBeenCalledWith(EVENT_A.venueId, EVENT_A.eventId, 'signature');
    });

    it('hides unauthorized quick links', () => {
      renderCard(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: false, eventDate: futureDate() },
        { canViewFinancials: true, canLockBudget: false },
      );
      expect(screen.getByTestId(`event-card-link-deal-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(
        screen.queryByTestId(`event-card-link-lock-budget-${EVENT_A.eventId}`),
      ).not.toBeInTheDocument();
    });

    it('shows Open workspace when all phase links are unauthorized', () => {
      renderCard(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: true, eventDate: futureDate() },
        { canViewFinancials: true, canEditSettlement: false, canSignSettlement: false },
      );
      expect(screen.getByTestId(`event-card-link-workspace-${EVENT_A.eventId}`)).toBeInTheDocument();
    });
  });

  describe('US3 — alerts', () => {
    it('shows variance badge when line items have negative variance', () => {
      renderCard(EVENT_A, FULL_PERMISSIONS, {
        lineItems: [{ qboActualValue: '40.00', settlementValue: '50.00', variance: '-10.00' }],
      });
      openBadgePopover(EVENT_A.eventId!);
      expect(screen.getByTestId(`event-card-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('hides variance badge without negative variance', () => {
      renderCard(EVENT_A, FULL_PERMISSIONS, {
        lineItems: [{ qboActualValue: '50.00', settlementValue: '50.00', variance: '0.00' }],
      });
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-badge-count-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('hides variance badge when lineItems omitted', () => {
      renderCard(EVENT_A);
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-badge-count-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows variance badge when hasVarianceConcern true without a variance action link', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: false,
        eventDate: futureDate(),
        hasVarianceConcern: true,
        unmappedCount: 0,
      });
      openBadgePopover(EVENT_A.eventId!);
      expect(screen.getByTestId(`event-card-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('shows variance action link instead of badge when hasVarianceConcern is true on Post-Show', () => {
      renderCard({
        ...EVENT_A,
        status: 'SETTLED',
        isBudgetLocked: true,
        eventDate: pastDate(),
        hasVarianceConcern: true,
        unmappedCount: 0,
      });
      expect(screen.getByTestId(`event-card-link-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows variance action link for SETTLED event when hasVarianceConcern true', () => {
      renderCard({
        ...EVENT_A,
        status: 'SETTLED',
        isBudgetLocked: true,
        eventDate: pastDate(),
        hasVarianceConcern: true,
        unmappedCount: 0,
      });
      expect(screen.getByTestId(`event-card-link-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('hides variance badge for SETTLED event when hasVarianceConcern false', () => {
      renderCard({
        ...EVENT_A,
        status: 'SETTLED',
        isBudgetLocked: true,
        eventDate: pastDate(),
        hasVarianceConcern: false,
        unmappedCount: 0,
      });
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows variance action link for RECONCILED event when hasVarianceConcern true', () => {
      renderCard({
        ...EVENT_A,
        status: 'RECONCILED',
        isBudgetLocked: true,
        eventDate: pastDate(),
        hasVarianceConcern: true,
        unmappedCount: 0,
      });
      expect(screen.getByTestId(`event-card-link-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows unmapped accounts as a phase quick link fallback when no mapped action exists', () => {
      renderCard({
        ...EVENT_A,
        unmappedCount: 2,
        hasVarianceConcern: false,
      });
      expect(screen.getByTestId(`event-card-link-deal-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-alert-UNMAPPED_QBO-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows Capture Signature link instead of a missing signature tag', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
        settlementPdfAvailable: false,
      });
      expect(screen.getByTestId(`event-card-booking-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-badge-count-${EVENT_A.eventId}`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`event-card-link-signature-${EVENT_A.eventId}`)).toHaveTextContent(
        'Capture Signature',
      );
      expect(
        screen.queryByTestId(`event-card-alert-MISSING_SIGNATURE-${EVENT_A.eventId}`),
      ).not.toBeInTheDocument();
    });

    it('shows a single tag inline when only the booking badge is present', () => {
      renderCard(EVENT_A);
      expect(screen.getByTestId(`event-card-booking-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-badge-count-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows tag count and popover list when booking and variance badges are present', () => {
      renderCard({ ...EVENT_A, eventDate: futureDate() }, FULL_PERMISSIONS, {
        lineItems: [{ qboActualValue: '40.00', settlementValue: '50.00', variance: '-10.00' }],
      });

      expect(screen.getByTestId(`event-card-badge-count-${EVENT_A.eventId}`)).toHaveTextContent('2');
      expect(screen.getByTestId(`event-card-badge-featured-${EVENT_A.eventId}`)).toHaveTextContent(
        'Confirmed',
      );
      expect(screen.queryByTestId(`event-card-booking-${EVENT_A.eventId}`)).not.toBeInTheDocument();

      openBadgePopover(EVENT_A.eventId!);
      expect(screen.getByTestId(`event-card-badge-popover-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-booking-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('features booking status on upcoming events with multiple status badges', () => {
      renderCard({ ...EVENT_A, eventDate: futureDate() }, FULL_PERMISSIONS, {
        lineItems: [{ qboActualValue: '40.00', settlementValue: '50.00', variance: '-10.00' }],
      });

      expect(screen.getByTestId(`event-card-badge-count-${EVENT_A.eventId}`)).toHaveClass(
        'event-card__badge-count--status',
      );
      expect(screen.getByTestId(`event-card-badge-featured-${EVENT_A.eventId}`)).toHaveTextContent(
        'Confirmed',
      );
    });
  });

  describe('compact layout', () => {
    it('shows title and status on the first row without pin or quick links', () => {
      renderCard(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: false, eventDate: futureDate() },
        FULL_PERMISSIONS,
        { compact: true, onPinToggle: vi.fn() },
      );

      const card = screen.getByTestId(`event-card-${EVENT_A.eventId}`);
      expect(card).toHaveClass('event-card--compact');
      expect(card.querySelector('.event-card__meta-row')).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-booking-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-pin-${EVENT_A.eventId}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-link-deal-${EVENT_A.eventId}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-link-lock-budget-${EVENT_A.eventId}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`event-card-progress-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('renders progress bar on compact dashboard event cards', () => {
      renderCard(
        {
          ...EVENT_A,
          status: 'PRE_SHOW',
          isBudgetLocked: false,
          eventDate: futureDate(),
          isPinned: true,
        },
        FULL_PERMISSIONS,
        { compact: true, isPinned: true, showProgressBar: true },
      );

      expect(screen.getByTestId(`event-card-progress-${EVENT_A.eventId}`)).toBeInTheDocument();
    });
  });

  describe('US4 — pin', () => {
    it('hides pin control when onPinToggle is not supplied', () => {
      renderCard(EVENT_A);
      expect(screen.queryByTestId(`event-card-pin-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('toggles pin via onPinToggle callback', () => {
      const onPinToggle = vi.fn();
      renderCard(EVENT_A, FULL_PERMISSIONS, { isPinned: false, onPinToggle });
      fireEvent.click(screen.getByTestId(`event-card-pin-${EVENT_A.eventId}`));
      expect(onPinToggle).toHaveBeenCalledTimes(1);
    });

    it('parent can persist pin state via pinnedEventStorage', () => {
      setEventPinned(EVENT_A.venueId!, EVENT_A.eventId!, true);
      expect(isEventPinned(EVENT_A.venueId!, EVENT_A.eventId!)).toBe(true);
    });
  });

  describe('card activation', () => {
    it('invokes onActivate when clicking card body but not buttons', () => {
      const onActivate = vi.fn();
      render(
        <EventCard
          event={EVENT_A}
          permissions={FULL_PERMISSIONS}
          onQuickLink={vi.fn()}
          onActivate={onActivate}
          showProgressBar
        />,
      );

      fireEvent.click(screen.getByText('Show A'));
      expect(onActivate).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId(`event-card-progress-bubble-confirmed-${EVENT_A.eventId}`));
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('invokes onActivate on Enter when focus is on the card', () => {
      const onActivate = vi.fn();
      render(
        <EventCard
          event={EVENT_A}
          permissions={FULL_PERMISSIONS}
          onQuickLink={vi.fn()}
          onActivate={onActivate}
        />,
      );

      const card = screen.getByTestId(`event-card-${EVENT_A.eventId}`);
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onActivate).toHaveBeenCalledTimes(1);
    });
  });
});
