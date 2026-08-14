import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  useBucketAllocations,
  useExpenseSourceSummary,
  useRevenueBuckets,
} from '@/api/festivalFinancials';
import { useFestivalQboTransactions, useResolveQboReview } from '@/api/festivalQbo';
import { AllocationEditor } from '@/components/festival/AllocationEditor';
import { BucketTable } from '@/components/festival/BucketTable';
import { SplitEditor, type SplitMethod } from '@/components/festival/SplitEditor';
import { TransactionMappingDrawer } from '@/components/festival/TransactionMappingDrawer';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import type { FestivalQboTransactionResponse } from '@/types/generated-api';

export interface FestivalLedgerPageProps {
  venueId: string;
  eventId: string;
  sourceLineItemId?: string;
  canManage?: boolean;
}

export function FestivalLedgerPage({
  venueId,
  eventId,
  sourceLineItemId,
  canManage = true,
}: FestivalLedgerPageProps) {
  const [selectedBucketId, setSelectedBucketId] = useState<string | undefined>();
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');
  const [exceptionFilter, setExceptionFilter] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<FestivalQboTransactionResponse | null>(null);

  const bucketsQuery = useRevenueBuckets(venueId, eventId);
  const buckets = bucketsQuery.data ?? [];

  const activeBucketId = selectedBucketId ?? buckets[0]?.id ?? undefined;
  const activeBucket = buckets.find((bucket) => bucket.id === activeBucketId) ?? null;

  const allocationsQuery = useBucketAllocations(venueId, eventId, activeBucketId);
  const expenseSummaryQuery = useExpenseSourceSummary(venueId, eventId, sourceLineItemId);
  const qboQuery = useFestivalQboTransactions(
    venueId,
    eventId,
    exceptionFilter ? { reviewState: 'UNTAGGED' } : {},
  );
  const resolveReview = useResolveQboReview(venueId, eventId);

  const splitPreview = useMemo(() => {
    if (!sourceLineItemId) {
      return [];
    }
    return [
      { id: 'preview-a', label: 'Main Stage — Day 1', amount: '333.33' },
      { id: 'preview-b', label: 'Rodeo Arena — Day 1', amount: '333.33' },
      { id: 'preview-c', label: 'Overhead (implicit)', amount: '333.34' },
    ];
  }, [sourceLineItemId]);

  const qboRows = (qboQuery.data ?? []).filter((row) =>
    exceptionFilter ? (row.reviewState ?? 'NONE') !== 'NONE' : true,
  );

  return (
    <div className="festival-ledger-page" data-testid="festival-ledger-page">
      <header className="festival-ledger-page__header">
        <button
          type="button"
          className="btn-icon-label festival-ledger-page__back"
          onClick={() => navigateToEventWorkspace(venueId, eventId)}
        >
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Back to event
        </button>
        <h1 className="festival-ledger-page__title">Master festival ledger</h1>
        <p className="festival-ledger-page__subtitle">
          Revenue buckets, block allocations, and shared expense splits.
        </p>
      </header>

      <label className="festival-ledger-page__exception-filter">
        <input
          type="checkbox"
          data-testid="festival-qbo-exception-filter"
          checked={exceptionFilter}
          onChange={(event) => setExceptionFilter(event.target.checked)}
        />
        Show exception queue only
      </label>

      {bucketsQuery.isLoading ? (
        <p className="festival-ledger-page__loading">Loading ledger…</p>
      ) : (
        <div className="festival-ledger-page__layout">
          <BucketTable
            venueId={venueId}
            eventId={eventId}
            buckets={buckets}
            canManage={canManage}
            selectedBucketId={activeBucketId}
            onSelectBucket={setSelectedBucketId}
          />

          <AllocationEditor
            bucket={activeBucket}
            allocations={allocationsQuery.data ?? []}
            canManage={canManage}
          />

          <SplitEditor
            summary={expenseSummaryQuery.data ?? null}
            method={splitMethod}
            onMethodChange={setSplitMethod}
            previewTargets={splitPreview}
            canManage={canManage}
          />

          <section className="festival-ledger-page__qbo" data-testid="festival-qbo-inbox">
            <h2>QBO transactions</h2>
            <ul>
              {qboRows.map((row) => (
                <li key={row.id}>
                  <button type="button" onClick={() => setSelectedTransaction(row)}>
                    {row.qboTransactionId} · ${row.amount} · {row.reviewState}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <TransactionMappingDrawer
        open={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        canManage={canManage}
        resolving={resolveReview.isPending}
        onResolve={async (resolution, reason) => {
          if (!selectedTransaction?.id) {
            return;
          }
          await resolveReview.mutateAsync({
            transactionId: selectedTransaction.id,
            resolution,
            reason,
          });
          setSelectedTransaction(null);
          await qboQuery.refetch();
        }}
      />
    </div>
  );
}
