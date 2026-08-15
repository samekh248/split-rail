import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';
import { useUpdateRevenueBucket } from '@/api/festivalFinancials';
import { formatMoney } from '@/lib/money';
import type { RevenueBucketResponse } from '@/types/generated-api';

export interface BucketTableProps {
  venueId: string;
  eventId: string;
  buckets: RevenueBucketResponse[];
  canManage?: boolean;
  selectedBucketId?: string;
  onSelectBucket?: (bucketId: string) => void;
}

function parseAmount(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function BucketTable({
  venueId,
  eventId,
  buckets,
  canManage = false,
  selectedBucketId,
  onSelectBucket,
}: BucketTableProps) {
  const updateBucket = useUpdateRevenueBucket(venueId, eventId);

  const toggleAllocable = async (bucket: RevenueBucketResponse) => {
    if (!canManage || bucket.lockedAt) {
      return;
    }
    await updateBucket.mutateAsync({
      bucketId: bucket.id ?? '',
      body: {
        name: bucket.name ?? '',
        amount: bucket.amount ?? '0',
        isAllocable: !bucket.isAllocable,
        linkedLineItemId: bucket.linkedLineItemId ?? null,
      },
    });
  };

  return (
    <section className="bucket-table" data-testid="bucket-table">
      <h3 className="bucket-table__title">Revenue buckets</h3>
      <table className="bucket-table__grid">
        <thead>
          <tr>
            <th scope="col">Bucket</th>
            <th scope="col">Amount</th>
            <th scope="col">Allocated</th>
            <th scope="col">Remaining</th>
            <th scope="col">Allocable</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => {
            const remaining = parseAmount(bucket.remaining);
            const isOverAllocated = remaining < 0;
            const isSelected = bucket.id === selectedBucketId;

            return (
              <tr
                key={bucket.id}
                className={isSelected ? 'bucket-table__row--selected' : undefined}
                data-testid={`bucket-row-${bucket.id}`}
                onClick={() => bucket.id && onSelectBucket?.(bucket.id)}
              >
                <td>{bucket.name}</td>
                <td>{formatMoney(bucket.amount ?? '0')}</td>
                <td>{formatMoney(bucket.totalAllocated ?? '0')}</td>
                <td
                  className={isOverAllocated ? 'bucket-table__remaining--warning' : undefined}
                  data-testid={`bucket-remaining-${bucket.id}`}
                >
                  {formatMoney(bucket.remaining ?? '0')}
                </td>
                <td>
                  {canManage ? (
                    <button
                      type="button"
                      className="bucket-table__toggle"
                      data-testid={`bucket-allocable-${bucket.id}`}
                      disabled={Boolean(bucket.lockedAt) || updateBucket.isPending}
                      aria-pressed={bucket.isAllocable ?? false}
                      onClick={(event) => {
                        event.stopPropagation();
                        void toggleAllocable(bucket);
                      }}
                    >
                      {bucket.isAllocable ? 'Yes' : 'No'}
                    </button>
                  ) : (
                    <span data-testid={`bucket-allocable-${bucket.id}`}>
                      {bucket.isAllocable ? 'Yes' : 'No'}
                    </span>
                  )}
                </td>
                <td data-testid={`bucket-lock-${bucket.id}`}>
                  {bucket.lockedAt ? (
                    <span className="bucket-table__locked" title="Locked by finalized settlement">
                      <FontAwesomeIcon icon={faLock} aria-hidden="true" /> Locked
                    </span>
                  ) : (
                    <span className="bucket-table__unlocked">
                      <FontAwesomeIcon icon={faUnlock} aria-hidden="true" /> Open
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {buckets.length === 0 ? (
        <p className="bucket-table__empty" data-testid="bucket-table-empty">
          No revenue buckets yet.
        </p>
      ) : null}
    </section>
  );
}
