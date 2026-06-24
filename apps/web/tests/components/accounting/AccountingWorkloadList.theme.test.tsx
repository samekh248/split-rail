import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountingWorkloadList } from '@/components/accounting/AccountingWorkloadList';

describe('AccountingWorkloadList theme', () => {
  it('renders badge-action-required on unassigned count and alert labels', () => {
    render(
      <AccountingWorkloadList
        events={[
          {
            eventId: 'evt-1',
            venueId: 'ven-1',
            title: 'Show A',
            eventDate: '2026-08-01',
            unmappedCount: 2,
            alertLabels: ['Variance review needed'],
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
});
