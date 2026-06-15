import { useCallback, useState } from 'react';
import {
  useCreateArtist,
  useCreateLineItem,
  useDeleteArtist,
  useLedger,
  useLockBudget,
  useRecalculateLedger,
  useUpdateLineItem,
} from '@/api/ledger';
import { ArtistDealPanel } from '@/components/artists/ArtistDealPanel';
import { LedgerGrid } from '@/components/ledger/LedgerGrid';
import { SyncNowButton } from '@/components/qbo/SyncNowButton';
import { UnmappedBanner } from '@/components/qbo/UnmappedBanner';
import { FinalizeSettlementPanel } from '@/components/settlement/FinalizeSettlementPanel';
import { SettlementLockedBanner } from '@/components/settlement/SettlementLockedBanner';

interface EventLedgerPageProps {
  venueId: string;
  eventId: string;
}

export function EventLedgerPage({ venueId, eventId }: EventLedgerPageProps) {
  const { data: ledger, isLoading, error } = useLedger(venueId, eventId);
  const recalculate = useRecalculateLedger(venueId, eventId);
  const updateLineItem = useUpdateLineItem(venueId, eventId);
  const createLineItem = useCreateLineItem(venueId, eventId);
  const lockBudget = useLockBudget(venueId, eventId);
  const createArtist = useCreateArtist(venueId, eventId);
  const deleteArtist = useDeleteArtist(venueId, eventId);
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const saveLineItemField = useCallback(
    async (
      id: string,
      field: 'proformaValue' | 'settlementValue' | 'notes',
      value: string,
    ) => {
      if (!ledger) return;
      const row = ledger.blocks.flatMap((b) => b.rows).find((r) => r.id === id);
      if (!row) return;

      await updateLineItem.mutateAsync({
        id,
        rowLabel: row.rowLabel,
        sortOrder: row.sortOrder,
        isArtistDeduction: row.isArtistDeduction,
        proformaValue: field === 'proformaValue' ? value : row.proformaValue,
        settlementValue: field === 'settlementValue' ? value : row.settlementValue,
        notes: field === 'notes' ? value : row.notes,
        rowVersion: row.rowVersion,
      });
      await recalculate.mutateAsync();
    },
    [ledger, updateLineItem, recalculate],
  );

  if (isLoading) {
    return <p data-testid="ledger-loading">Loading ledger…</p>;
  }

  if (error) {
    return (
      <p role="alert" data-testid="ledger-error">
        Failed to load ledger: {error.message}
      </p>
    );
  }

  if (!ledger) {
    return <p data-testid="ledger-empty">No ledger data.</p>;
  }

  const lineItemOptions = ledger.blocks
    .flatMap((block) => block.rows)
    .map((row) => ({ id: row.id, label: row.rowLabel }));

  return (
    <main className="event-ledger-page" data-testid="event-ledger-page">
      <div className="event-ledger-page__toolbar">
        <SyncNowButton venueId={venueId} eventId={eventId} />
      </div>

      <UnmappedBanner
        venueId={venueId}
        eventId={eventId}
        lineItemOptions={lineItemOptions}
      />

      <SettlementLockedBanner
        venueId={venueId}
        eventId={eventId}
        status={ledger.status}
        settlementPdfAvailable={ledger.settlementPdfAvailable}
      />

      {ledger.isBudgetLocked && ledger.status === 'PRE_SHOW' && (
        <FinalizeSettlementPanel venueId={venueId} eventId={eventId} />
      )}

      <LedgerGrid
        ledger={ledger}
        lockBudgetPending={lockBudget.isPending}
        onLockBudget={() => lockBudget.mutate()}
        onProformaChange={(id, value) => void saveLineItemField(id, 'proformaValue', value)}
        onSettlementChange={(id, value) =>
          void saveLineItemField(id, 'settlementValue', value)
        }
        onNotesChange={(id, notes) => void saveLineItemField(id, 'notes', notes)}
      />

      <ArtistDealPanel
        artists={ledger.artists}
        eventStatus={ledger.status}
        formulaError={formulaError}
        onAddArtist={async (artist) => {
          setFormulaError(null);
          try {
            await createArtist.mutateAsync(artist);
            await recalculate.mutateAsync();
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add artist';
            if (message.includes('422')) {
              setFormulaError('Formula could not be evaluated. Check tokens and syntax.');
            }
            throw err;
          }
        }}
        onRemoveArtist={async (id) => {
          await deleteArtist.mutateAsync(id);
          await recalculate.mutateAsync();
        }}
      />

      <aside className="event-ledger-page__dev-tools">
        <button
          type="button"
          data-testid="add-sample-row-btn"
          onClick={() =>
            createLineItem.mutate({
              blockType: 'EXPENSES',
              rowLabel: 'New expense',
              sortOrder: 99,
              isArtistDeduction: false,
              proformaValue: '0.00',
              settlementValue: '0.00',
            })
          }
        >
          Add sample expense row
        </button>
      </aside>
    </main>
  );
}
