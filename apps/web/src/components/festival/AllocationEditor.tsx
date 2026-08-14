import { formatMoney } from '@/lib/money';
import type { RevenueAllocationResponse, RevenueBucketResponse } from '@/types/generated-api';

export interface AllocationEditorProps {
  bucket: RevenueBucketResponse | null;
  allocations: RevenueAllocationResponse[];
  canManage?: boolean;
}

function parseAmount(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AllocationEditor({
  bucket,
  allocations,
  canManage = false,
}: AllocationEditorProps) {
  if (!bucket) {
    return (
      <section className="allocation-editor" data-testid="allocation-editor">
        <p className="allocation-editor__placeholder">Select a bucket to manage allocations.</p>
      </section>
    );
  }

  const remaining = parseAmount(bucket.remaining);
  const isOverAllocated = remaining < 0;
  const isDraftWarning = isOverAllocated && canManage;

  return (
    <section className="allocation-editor" data-testid="allocation-editor">
      <header className="allocation-editor__header">
        <h3 className="allocation-editor__title">Allocations — {bucket.name}</h3>
        <p
          className={
            isOverAllocated
              ? 'allocation-editor__balance allocation-editor__balance--error'
              : 'allocation-editor__balance'
          }
          data-testid="allocation-balance-status"
          role={isOverAllocated ? 'alert' : undefined}
        >
          {isOverAllocated
            ? `Over-allocated by ${formatMoney(String(Math.abs(remaining)))}`
            : `${formatMoney(bucket.remaining ?? '0')} remaining`}
        </p>
      </header>

      {isDraftWarning ? (
        <p className="allocation-editor__warning" data-testid="allocation-draft-warning">
          Draft over-allocation is visible but must be resolved before finalization.
        </p>
      ) : null}

      {!bucket.isAllocable ? (
        <p className="allocation-editor__info" data-testid="allocation-not-allocable">
          This bucket is not marked allocable. Enable allocation in the bucket table first.
        </p>
      ) : null}

      <ul className="allocation-editor__list">
        {allocations.map((line) => {
          const hasWarning = (line.warnings ?? []).some((w) => w.code === 'BUCKET_OVERALLOCATED');

          return (
            <li
              key={line.id}
              className="allocation-editor__line"
              data-testid={`allocation-line-${line.id}`}
            >
              <span className="allocation-editor__block">{line.blockTitle}</span>
              <span className="allocation-editor__source" data-testid="allocation-source-bucket">
                from {line.bucketName}
              </span>
              <span className="allocation-editor__amount">
                {formatMoney(line.calculatedAmount ?? '0')}
              </span>
              {line.roundingAdjustment ? (
                <span
                  className="allocation-editor__rounding"
                  data-testid="allocation-rounding-adjustment"
                >
                  Rounding adj. {formatMoney(line.roundingAdjustment)}
                </span>
              ) : null}
              {hasWarning ? (
                <span className="allocation-editor__line-warning" data-testid="allocation-line-warning">
                  Over bucket limit
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {allocations.length === 0 ? (
        <p className="allocation-editor__empty" data-testid="allocation-editor-empty">
          No block allocations from this bucket yet.
        </p>
      ) : null}
    </section>
  );
}
