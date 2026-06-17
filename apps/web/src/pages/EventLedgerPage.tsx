import { useCallback, useState } from 'react';
import {
  useCreateArtist,
  useCreateLineItem,
  useDeleteArtist,
  useDeleteLineItem,
  useLedger,
  useLockBudget,
  useRecalculateLedger,
  useUpdateLineItem,
} from '@/api/ledger';
import { ArtistDealPanel } from '@/components/artists/ArtistDealPanel';
import { LedgerGrid } from '@/components/ledger/LedgerGrid';
import { SyncNowButton } from '@/components/qbo/SyncNowButton';
import { UnmappedBanner } from '@/components/qbo/UnmappedBanner';
import { useCanEditLedgerStructure } from '@/hooks/useCanEditLedgerStructure';
import { getReorderSwapPair } from '@/lib/reorderLineItems';
import type { MoveDirection } from '@/lib/reorderLineItems';
import type {
  CreateLineItemRequest,
  EventStatus,
  LineItemDto,
} from '@/types/generated-api';
import { FinalizeSettlementPanel } from '@/components/settlement/FinalizeSettlementPanel';
import { SettlementLockedBanner } from '@/components/settlement/SettlementLockedBanner';

interface EventLedgerPageProps {
  venueId: string;
  eventId: string;
}

function findRow(ledger: NonNullable<ReturnType<typeof useLedger>['data']>, id: string) {
  return (ledger.blocks ?? [])
    .flatMap((block) => block.rows ?? [])
    .find((row) => row.id === id);
}

export function EventLedgerPage({ venueId, eventId }: EventLedgerPageProps) {
  const { data: ledger, isLoading, error, refetch } = useLedger(venueId, eventId);
  const recalculate = useRecalculateLedger(venueId, eventId);
  const updateLineItem = useUpdateLineItem(venueId, eventId);
  const createLineItem = useCreateLineItem(venueId, eventId);
  const deleteLineItem = useDeleteLineItem(venueId, eventId);
  const lockBudget = useLockBudget(venueId, eventId);
  const createArtist = useCreateArtist(venueId, eventId);
  const deleteArtist = useDeleteArtist(venueId, eventId);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [structuralError, setStructuralError] = useState<string | null>(null);

  const canEditStructure = useCanEditLedgerStructure(
    ledger?.status,
    ledger?.isBudgetLocked ?? false,
  );

  const saveLineItemField = useCallback(
    async (
      id: string,
      field: 'proformaValue' | 'settlementValue' | 'notes',
      value: string,
    ) => {
      if (!ledger) return;
      const row = findRow(ledger, id);
      if (!row) return;

      setStructuralError(null);
      try {
        await updateLineItem.mutateAsync({
          id,
          rowLabel: row.rowLabel ?? '',
          sortOrder: row.sortOrder ?? 0,
          isArtistDeduction: row.isArtistDeduction ?? false,
          proformaValue: field === 'proformaValue' ? value : row.proformaValue,
          settlementValue: field === 'settlementValue' ? value : row.settlementValue,
          notes: field === 'notes' ? value : row.notes ?? '',
          isHiddenFromPromoter: row.isHiddenFromPromoter ?? false,
          rowVersion: row.rowVersion ?? '',
        });
        await recalculate.mutateAsync();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save line item';
        setStructuralError(message);
        void refetch();
      }
    },
    [ledger, updateLineItem, recalculate, refetch],
  );

  const saveLineItemRow = useCallback(
    async (id: string, patch: Partial<LineItemDto>) => {
      if (!ledger) return;
      const row = findRow(ledger, id);
      if (!row) return;

      setStructuralError(null);
      try {
        await updateLineItem.mutateAsync({
          id,
          rowLabel: patch.rowLabel ?? row.rowLabel ?? '',
          sortOrder: patch.sortOrder ?? row.sortOrder ?? 0,
          isArtistDeduction: patch.isArtistDeduction ?? row.isArtistDeduction ?? false,
          proformaValue: patch.proformaValue ?? row.proformaValue ?? '0.00',
          settlementValue: patch.settlementValue ?? row.settlementValue ?? '0.00',
          notes: patch.notes ?? row.notes ?? '',
          isHiddenFromPromoter: patch.isHiddenFromPromoter ?? row.isHiddenFromPromoter ?? false,
          rowVersion: patch.rowVersion ?? row.rowVersion ?? '',
        });
        await recalculate.mutateAsync();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save line item';
        setStructuralError(message);
        void refetch();
      }
    },
    [ledger, updateLineItem, recalculate, refetch],
  );

  const handleAddLineItem = useCallback(
    async (request: CreateLineItemRequest) => {
      setStructuralError(null);
      try {
        await createLineItem.mutateAsync(request);
        await recalculate.mutateAsync();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add line item';
        setStructuralError(message);
        void refetch();
        throw err;
      }
    },
    [createLineItem, recalculate, refetch],
  );

  const handleDeleteLineItem = useCallback(
    async (id: string) => {
      setStructuralError(null);
      try {
        await deleteLineItem.mutateAsync(id);
        await recalculate.mutateAsync();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete line item';
        setStructuralError(message);
        void refetch();
      }
    },
    [deleteLineItem, recalculate, refetch],
  );

  const handleMoveLineItem = useCallback(
    async (id: string, direction: MoveDirection) => {
      if (!ledger) return;

      const block = (ledger.blocks ?? []).find((entry) =>
        (entry.rows ?? []).some((row) => row.id === id),
      );
      if (!block?.rows) return;

      const swap = getReorderSwapPair(block.rows, id, direction);
      if (!swap?.current.id || !swap.neighbor.id) return;

      setStructuralError(null);
      try {
        await updateLineItem.mutateAsync({
          id: swap.current.id,
          rowLabel: swap.current.rowLabel ?? '',
          sortOrder: swap.neighbor.sortOrder ?? 0,
          isArtistDeduction: swap.current.isArtistDeduction ?? false,
          proformaValue: swap.current.proformaValue ?? '0.00',
          settlementValue: swap.current.settlementValue ?? '0.00',
          notes: swap.current.notes ?? '',
          isHiddenFromPromoter: swap.current.isHiddenFromPromoter ?? false,
          rowVersion: swap.current.rowVersion ?? '',
        });
        await updateLineItem.mutateAsync({
          id: swap.neighbor.id,
          rowLabel: swap.neighbor.rowLabel ?? '',
          sortOrder: swap.current.sortOrder ?? 0,
          isArtistDeduction: swap.neighbor.isArtistDeduction ?? false,
          proformaValue: swap.neighbor.proformaValue ?? '0.00',
          settlementValue: swap.neighbor.settlementValue ?? '0.00',
          notes: swap.neighbor.notes ?? '',
          isHiddenFromPromoter: swap.neighbor.isHiddenFromPromoter ?? false,
          rowVersion: swap.neighbor.rowVersion ?? '',
        });
        await recalculate.mutateAsync();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reorder line item';
        setStructuralError(message);
        void refetch();
      }
    },
    [ledger, updateLineItem, recalculate, refetch],
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

  const lineItemOptions = (ledger.blocks ?? [])
    .flatMap((block) => block.rows ?? [])
    .filter((row) => row.id)
    .map((row) => ({ id: row.id!, label: row.rowLabel ?? '' }));

  return (
    <main className="event-ledger-page" data-testid="event-ledger-page">
      <div className="event-ledger-page__toolbar">
        <SyncNowButton venueId={venueId} eventId={eventId} />
      </div>

      {structuralError && (
        <p role="alert" data-testid="structural-error" className="event-ledger-page__error">
          {structuralError}
        </p>
      )}

      <UnmappedBanner
        venueId={venueId}
        eventId={eventId}
        lineItemOptions={lineItemOptions}
      />

      <SettlementLockedBanner
        venueId={venueId}
        eventId={eventId}
        status={ledger.status as EventStatus}
        settlementPdfAvailable={ledger.settlementPdfAvailable}
      />

      {ledger.isBudgetLocked && ledger.status === 'PRE_SHOW' && (
        <FinalizeSettlementPanel venueId={venueId} eventId={eventId} />
      )}

      <LedgerGrid
        ledger={ledger}
        canEditStructure={canEditStructure}
        lockBudgetPending={lockBudget.isPending}
        onLockBudget={() => lockBudget.mutate()}
        onProformaChange={(id, value) => void saveLineItemField(id, 'proformaValue', value)}
        onSettlementChange={(id, value) =>
          void saveLineItemField(id, 'settlementValue', value)
        }
        onNotesChange={(id, notes) => void saveLineItemField(id, 'notes', notes)}
        onLabelChange={(id, label) => void saveLineItemRow(id, { rowLabel: label })}
        onDeductionChange={(id, isArtistDeduction) =>
          void saveLineItemRow(id, { isArtistDeduction })
        }
        onDeleteLineItem={(id) => void handleDeleteLineItem(id)}
        onMoveLineItem={(id, direction) => void handleMoveLineItem(id, direction)}
        onAddLineItem={handleAddLineItem}
      />

      <ArtistDealPanel
        artists={ledger.artists ?? []}
        eventStatus={ledger.status as EventStatus}
        formulaError={formulaError}
        onAddArtist={async (artist) => {
          setFormulaError(null);
          try {
            await createArtist.mutateAsync({
              artistName: artist.artistName,
              performanceOrder: artist.performanceOrder,
              dealType: artist.dealType,
              customFormulaExpression: artist.customFormulaExpression ?? null,
              baseGuarantee: artist.baseGuarantee,
              backendPercentage: artist.backendPercentage,
              taxWithholdingPercentage: artist.taxWithholdingPercentage,
            });
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
    </main>
  );
}
