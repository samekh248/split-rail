import { useState } from 'react';
import { useUnmappedCount, useUnmappedTransactions } from '@/api/qbo';
import { formatMoney } from '@/lib/money';
import { InlineMappingDropdown } from './InlineMappingDropdown';

interface UnmappedBannerProps {
  venueId: string;
  eventId: string;
  lineItemOptions: Array<{ id: string; label: string }>;
}

export function UnmappedBanner({ venueId, eventId, lineItemOptions }: UnmappedBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: countData } = useUnmappedCount(venueId, eventId);
  const { data: listData } = useUnmappedTransactions(venueId, eventId, expanded);

  const count = countData?.unmappedCount ?? 0;
  if (count === 0) return null;

  return (
    <section className="unmapped-banner" data-testid="unmapped-banner" role="alert">
      <button
        type="button"
        className="unmapped-banner__toggle"
        onClick={() => setExpanded((v) => !v)}
        data-testid="unmapped-banner-toggle"
      >
        {count} unassigned transaction{count === 1 ? '' : 's'} detected
      </button>

      {expanded && listData && (
        <ul className="unmapped-banner__list" data-testid="unmapped-list">
          {(listData.transactions ?? []).map((txn) => (
            <li key={txn.id} data-testid={`unmapped-item-${txn.id}`}>
              <span>{txn.qboAccountName}</span>
              <span>{formatMoney(txn.amount)}</span>
              <span>{txn.transactionDate}</span>
              <InlineMappingDropdown
                venueId={venueId}
                eventId={eventId}
                transaction={txn}
                lineItemOptions={lineItemOptions}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
