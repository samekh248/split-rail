import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinancialHealthWidget } from '@/components/dashboard/FinancialHealthWidget';
import { formatMoney } from '@/lib/money';
import type { FinancialHealthDto } from '@/types/generated-api';

const FIXTURE: FinancialHealthDto = {
  weekStart: '2026-06-16',
  weekEnd: '2026-06-22',
  projectedNetGross: '5000.00',
  actualQboDeposits: '4200.50',
  variance: '799.50',
};

describe('FinancialHealthWidget', () => {
  it('renders week range and three money testids from fixture DTO', () => {
    render(<FinancialHealthWidget financialHealth={FIXTURE} isLoading={false} />);

    expect(screen.getByTestId('financial-health-widget')).toBeInTheDocument();
    expect(screen.getByTestId('financial-health-week-range')).toHaveTextContent('Jun 16, 2026');
    expect(screen.getByTestId('financial-health-week-range')).toHaveTextContent('Jun 22, 2026');
    expect(screen.getByTestId('financial-health-projected')).toBeInTheDocument();
    expect(screen.getByTestId('financial-health-actual')).toBeInTheDocument();
    expect(screen.getByTestId('financial-health-variance')).toBeInTheDocument();
  });

  it('returns null when loading or financialHealth undefined', () => {
    const { container, rerender } = render(
      <FinancialHealthWidget financialHealth={FIXTURE} isLoading />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<FinancialHealthWidget financialHealth={undefined} isLoading={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('formats monetary values with formatMoney', () => {
    render(<FinancialHealthWidget financialHealth={FIXTURE} isLoading={false} />);

    expect(screen.getByTestId('financial-health-projected')).toHaveTextContent(
      formatMoney('5000.00'),
    );
    expect(screen.getByTestId('financial-health-actual')).toHaveTextContent(
      formatMoney('4200.50'),
    );
    expect(screen.getByTestId('financial-health-variance')).toHaveTextContent(
      formatMoney('799.50'),
    );
  });
});
