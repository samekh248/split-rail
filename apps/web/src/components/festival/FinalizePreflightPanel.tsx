import { formatMoney } from '@/lib/money';
import type { PreflightBlockerDto } from '@/types/generated-api';

const CATEGORY_LABELS: Record<string, string> = {
  MissingRevenueMapping: 'Revenue mapping',
  MissingExpenseMapping: 'Expense mapping',
  AllocationConflict: 'Allocation conflict',
  MissingSettlementFields: 'Settlement fields',
  UnresolvedScheduleChange: 'Schedule change',
};

const LINK_TARGETS: Record<string, string> = {
  allocations: '#allocations',
  expenses: '#expenses',
  'deal-terms': '#deal-terms',
  history: '#history',
};

export function groupPreflightBlockers(blockers: PreflightBlockerDto[] | null | undefined) {
  const grouped = new Map<string, PreflightBlockerDto[]>();
  for (const blocker of blockers ?? []) {
    const key = blocker.category ?? 'Unknown';
    const list = grouped.get(key) ?? [];
    list.push(blocker);
    grouped.set(key, list);
  }
  return grouped;
}

export interface FinalizePreflightPanelProps {
  blockers: PreflightBlockerDto[] | null | undefined;
  ready?: boolean;
  finalPayable?: string | null;
}

export function FinalizePreflightPanel({
  blockers,
  ready = false,
  finalPayable,
}: FinalizePreflightPanelProps) {
  const grouped = groupPreflightBlockers(blockers);

  if (ready) {
    return (
      <section className="finalize-preflight finalize-preflight--ready" data-testid="finalize-preflight">
        <p className="finalize-preflight__ready">Ready to finalize.</p>
        {finalPayable != null ? (
          <p className="finalize-preflight__payable">
            Net payable: <strong>{formatMoney(finalPayable)}</strong>
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="finalize-preflight" data-testid="finalize-preflight">
      <h2 className="finalize-preflight__title">Resolve before finalizing</h2>
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category} className="finalize-preflight__group" data-testid={`preflight-group-${category}`}>
          <h3 className="finalize-preflight__group-title">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <ul className="finalize-preflight__list">
            {items.map((item, index) => {
              const href = LINK_TARGETS[item.linkTarget ?? ''] ?? `#${item.linkTarget ?? 'sheet'}`;
              return (
                <li key={`${category}-${index}`}>
                  <a href={href} className="finalize-preflight__link">
                    {item.message}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
