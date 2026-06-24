import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';
import { formatMoney } from '@/lib/money';
import type { FinancialHealthDto } from '@/types/generated-api';

export interface FinancialHealthWidgetProps {
  financialHealth?: FinancialHealthDto;
  isLoading: boolean;
}

function formatWeekDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return 'Date TBD';
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return 'Date TBD';
  }
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWeekRange(weekStart?: string | null, weekEnd?: string | null): string {
  return `${formatWeekDate(weekStart)} – ${formatWeekDate(weekEnd)}`;
}

export function FinancialHealthWidget({ financialHealth, isLoading }: FinancialHealthWidgetProps) {
  if (isLoading || !financialHealth) {
    return null;
  }

  return (
    <section className="financial-health-widget" data-testid="financial-health-widget">
      <h2 className="financial-health-widget__heading">
        <FontAwesomeIcon icon={faChartLine} className="financial-health-widget__icon" aria-hidden />
        Financial health
      </h2>
      <p className="financial-health-widget__week-range" data-testid="financial-health-week-range">
        {formatWeekRange(financialHealth.weekStart, financialHealth.weekEnd)}
      </p>
      <dl className="financial-health-widget__metrics">
        <div className="financial-health-widget__metric">
          <dt className="financial-health-widget__label">Projected net gross</dt>
          <dd className="financial-health-widget__value" data-testid="financial-health-projected">
            {formatMoney(financialHealth.projectedNetGross)}
          </dd>
        </div>
        <div className="financial-health-widget__metric">
          <dt className="financial-health-widget__label">Actual QBO deposits</dt>
          <dd className="financial-health-widget__value" data-testid="financial-health-actual">
            {formatMoney(financialHealth.actualQboDeposits)}
          </dd>
        </div>
        <div className="financial-health-widget__metric">
          <dt className="financial-health-widget__label">Variance</dt>
          <dd className="financial-health-widget__value" data-testid="financial-health-variance">
            {formatMoney(financialHealth.variance)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
