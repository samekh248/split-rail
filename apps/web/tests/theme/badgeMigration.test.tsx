import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountingWorkloadList } from '@/components/accounting/AccountingWorkloadList';
import { EventCard } from '@/components/dashboard/EventCard';
import { UnmappedBanner } from '@/components/qbo/UnmappedBanner';
import type { EventCardDto, PermissionsDto } from '@/types/generated-api';

vi.mock('@/api/qbo', () => ({
  useUnmappedCount: vi.fn(() => ({
    data: { eventId: 'evt-1', unmappedCount: 2 },
  })),
  useUnmappedTransactions: vi.fn(() => ({ data: undefined })),
  qboKeys: { unmappedList: () => ['qbo', 'unmapped-list'] },
}));

vi.mock('@/components/qbo/InlineMappingDropdown', () => ({
  InlineMappingDropdown: () => <div data-testid="inline-mapping-dropdown" />,
}));

const indexCssPath = resolve(__dirname, '../../src/index.css');

const FULL_PERMISSIONS: PermissionsDto = {
  canViewFinancials: true,
  canLockBudget: true,
  canEditSettlement: true,
  canSignSettlement: true,
  canTriggerQboSync: true,
};

const EVENT_WITH_ALERTS: EventCardDto = {
  eventId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  venueId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Show A',
  eventDate: '2026-08-01',
  status: 'PRE_SHOW',
  isBudgetLocked: true,
  settlementPdfAvailable: false,
  unmappedCount: 2,
  hasVarianceConcern: true,
};

describe('badge migration (SPLR-90)', () => {
  it('EventCard bottleneck alert chips use badge-action-required', () => {
    render(
      <EventCard
        event={EVENT_WITH_ALERTS}
        permissions={FULL_PERMISSIONS}
        onQuickLink={vi.fn()}
      />,
    );

    const alertChip = screen.getByTestId(
      `event-card-alert-MISSING_SIGNATURE-${EVENT_WITH_ALERTS.eventId}`,
    );
    expect(alertChip).toHaveClass('badge-action-required');
  });

  it('EventCard variance badge does not use badge-action-required', () => {
    render(
      <EventCard
        event={EVENT_WITH_ALERTS}
        permissions={FULL_PERMISSIONS}
        onQuickLink={vi.fn()}
      />,
    );

    const varianceBadge = screen.getByTestId(
      `event-card-variance-${EVENT_WITH_ALERTS.eventId}`,
    );
    expect(varianceBadge).toHaveClass('event-card__variance-badge');
    expect(varianceBadge).not.toHaveClass('badge-action-required');
  });

  it('UnmappedBanner renders badge-action-required when count > 0', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UnmappedBanner venueId="ven-1" eventId="evt-1" lineItemOptions={[]} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('unmapped-banner-badge')).toHaveClass('badge-action-required');
  });

  it('AccountingWorkloadList renders badge-action-required on unassigned and alert labels', () => {
    render(
      <AccountingWorkloadList
        events={[
          {
            eventId: 'evt-1',
            venueId: 'ven-1',
            title: 'Show A',
            eventDate: '2026-08-01',
            unmappedCount: 3,
            alertLabels: ['Not synced to QBO'],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('accounting-workload-unassigned-evt-1')).toHaveClass(
      'badge-action-required',
    );
    expect(screen.getByTestId('accounting-workload-alert-evt-1-0')).toHaveClass(
      'badge-action-required',
    );
  });

  it('variance surfaces in CSS are not grouped with badge-action-required', () => {
    const css = readFileSync(indexCssPath, 'utf-8');
    const varianceCellBlock = css.match(/\.variance-cell--flagged\s*\{[^}]+\}/)?.[0] ?? '';
    const varianceBannerBlock = css.match(/\.ledger-grid__variance-banner\s*\{[^}]+\}/)?.[0] ?? '';
    expect(varianceCellBlock).not.toContain('badge-action-required');
    expect(varianceCellBlock).toContain('var(--color-warning-bg)');
    expect(varianceBannerBlock).not.toContain('badge-action-required');
    expect(varianceBannerBlock).toContain('var(--color-warning-bg)');
  });
});
