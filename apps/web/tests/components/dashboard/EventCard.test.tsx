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
    />,
  );
  return { onQuickLink };
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
      expect(badge).toHaveAttribute('title', expect.stringContaining('full calendar coming soon'));
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

    it('shows Night Of quick links', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
        eventDate: futureDate(),
      });
      expect(screen.getByTestId(`event-card-link-settlement-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-link-signature-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('shows Post-Show quick links', () => {
      renderCard({
        ...EVENT_A,
        status: 'SETTLED',
        isBudgetLocked: true,
        eventDate: pastDate(),
      });
      expect(screen.getByTestId(`event-card-link-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
      expect(screen.getByTestId(`event-card-link-sync-${EVENT_A.eventId}`)).toBeInTheDocument();
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
      expect(screen.getByTestId(`event-card-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('hides variance badge without negative variance', () => {
      renderCard(EVENT_A, FULL_PERMISSIONS, {
        lineItems: [{ qboActualValue: '50.00', settlementValue: '50.00', variance: '0.00' }],
      });
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('hides variance badge when lineItems omitted', () => {
      renderCard(EVENT_A);
      expect(screen.queryByTestId(`event-card-variance-${EVENT_A.eventId}`)).not.toBeInTheDocument();
    });

    it('shows variance badge when hasVarianceConcern true', () => {
      renderCard({
        ...EVENT_A,
        hasVarianceConcern: true,
        unmappedCount: 0,
      });
      expect(screen.getByTestId(`event-card-variance-${EVENT_A.eventId}`)).toBeInTheDocument();
    });

    it('shows unmapped bottleneck when unmappedCount > 0', () => {
      renderCard({
        ...EVENT_A,
        unmappedCount: 2,
        hasVarianceConcern: false,
      });
      expect(
        screen.getByTestId(`event-card-alert-UNMAPPED_QBO-${EVENT_A.eventId}`),
      ).toHaveTextContent('2 unmapped accounts');
    });

    it('shows bottleneck alert chips', () => {
      renderCard({
        ...EVENT_A,
        status: 'PRE_SHOW',
        isBudgetLocked: true,
        settlementPdfAvailable: false,
      });
      expect(
        screen.getByTestId(`event-card-alert-MISSING_SIGNATURE-${EVENT_A.eventId}`),
      ).toHaveTextContent('Missing signature');
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
});
