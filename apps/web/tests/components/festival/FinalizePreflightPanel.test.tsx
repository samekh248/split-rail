import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinalizePreflightPanel } from '@/components/festival/FinalizePreflightPanel';

describe('FinalizePreflightPanel', () => {
  it('groups blockers by category with deep links', () => {
    render(
      <FinalizePreflightPanel
        ready={false}
        blockers={[
          {
            category: 'MissingRevenueMapping',
            message: 'No revenue is allocated to this block.',
            linkTarget: 'allocations',
          },
          {
            category: 'MissingSettlementFields',
            message: 'Set a guarantee before finalizing.',
            linkTarget: 'deal-terms',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('preflight-group-MissingRevenueMapping')).toBeInTheDocument();
    expect(screen.getByTestId('preflight-group-MissingSettlementFields')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /No revenue is allocated/ })).toHaveAttribute(
      'href',
      '#allocations',
    );
    expect(screen.getByRole('link', { name: /Set a guarantee/ })).toHaveAttribute(
      'href',
      '#deal-terms',
    );
  });
});
