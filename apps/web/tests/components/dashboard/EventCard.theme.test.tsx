import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventCard } from '@/components/dashboard/EventCard';
import type { PermissionsDto } from '@/types/generated-api';
import { EVENT_A } from '../../fixtures/events';

const FULL_PERMISSIONS: PermissionsDto = {
  canViewFinancials: true,
  canLockBudget: true,
  canEditSettlement: true,
  canSignSettlement: true,
  canTriggerQboSync: true,
};

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
});
