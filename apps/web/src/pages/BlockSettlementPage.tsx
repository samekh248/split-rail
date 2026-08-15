import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  useArtistSettlementRollup,
  useBlockSettlementPreflight,
  useBlockSettlementSheet,
  useFinalizeBlockSettlement,
  useMySettlementBlocks,
  useReopenBlockSettlement,
} from '@/api/blockSettlements';
import { ArtistRollupPanel } from '@/components/festival/ArtistRollupPanel';
import { FinalizePreflightPanel } from '@/components/festival/FinalizePreflightPanel';
import { ReopenDialog } from '@/components/festival/ReopenDialog';
import { buildFestivalItineraryPath, pushPath } from '@/lib/appRoute';
import { formatMoney } from '@/lib/money';

export interface BlockSettlementPageProps {
  venueId: string;
  eventId: string;
  blockId?: string;
  artistId?: string;
}

type FinalizeOutcome =
  | { kind: 'idle' }
  | { kind: 'success'; pdfUrl?: string | null }
  | { kind: 'failure'; step: string; message: string };

function formatSheetMoney(value?: string | null) {
  if (value == null) {
    return '—';
  }
  return formatMoney(value);
}

export function BlockSettlementPage({
  venueId,
  eventId,
  blockId: initialBlockId,
  artistId,
}: BlockSettlementPageProps) {
  const [selectedBlockId, setSelectedBlockId] = useState(initialBlockId ?? '');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [outcome, setOutcome] = useState<FinalizeOutcome>({ kind: 'idle' });
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  const queueQuery = useMySettlementBlocks(venueId, eventId);
  const sheetQuery = useBlockSettlementSheet(venueId, eventId, selectedBlockId || undefined);
  const preflightQuery = useBlockSettlementPreflight(venueId, eventId, selectedBlockId || undefined);
  const rollupQuery = useArtistSettlementRollup(venueId, eventId, artistId);
  const finalizeMutation = useFinalizeBlockSettlement(venueId, eventId, selectedBlockId);
  const reopenMutation = useReopenBlockSettlement(venueId, eventId, selectedBlockId);

  const sheet = sheetQuery.data;
  const isFinalized = sheet?.settlementStatus === 'FINALIZED';

  const queueItems = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);

  async function handleFinalize() {
    if (!online || !preflightQuery.data?.ready) {
      return;
    }

    setOutcome({ kind: 'idle' });
    try {
      const result = await finalizeMutation.mutateAsync({
        confirmed: true,
        expectedNetPayable: preflightQuery.data.finalPayable ?? undefined,
      });
      setOutcome({ kind: 'success', pdfUrl: result.pdfUrl });
      await sheetQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Finalization failed';
      const stepMatch = /step|archive|pdf|dispatch/i.exec(message);
      setOutcome({
        kind: 'failure',
        step: stepMatch?.[0] ?? 'finalization',
        message,
      });
    }
  }

  return (
    <div className="block-settlement-page" data-testid="block-settlement-page">
      <header className="block-settlement-page__header">
        <button
          type="button"
          className="btn-icon-label block-settlement-page__back"
          onClick={() => pushPath(buildFestivalItineraryPath(venueId, eventId))}
        >
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Back to itinerary
        </button>
        <h1 className="block-settlement-page__title">Block settlement</h1>
      </header>

      <aside className="block-settlement-page__queue" data-testid="my-blocks-queue">
        <h2>My blocks</h2>
        <ul>
          {queueItems.map((item) => (
            <li key={item.blockId}>
              <button
                type="button"
                className={
                  item.blockId === selectedBlockId
                    ? 'block-settlement-page__queue-item is-selected'
                    : 'block-settlement-page__queue-item'
                }
                onClick={() => {
                  if (item.blockId) {
                    setSelectedBlockId(item.blockId);
                    setOutcome({ kind: 'idle' });
                  }
                }}
              >
                <span>{item.title}</span>
                <span>{item.stageName}</span>
                <span>{item.settlementStatus}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {selectedBlockId ? (
        <main className="block-settlement-page__main">
          {sheetQuery.isLoading ? <p>Loading settlement sheet…</p> : null}
          {sheet ? (
            <>
              <section className="block-settlement-page__summary" id="deal-terms">
                <h2>{sheet.title}</h2>
                <p>
                  {sheet.dayDate} · {sheet.stageName} · {sheet.startTime}–{sheet.endTime}
                </p>
                <dl className="block-settlement-page__money">
                  <div>
                    <dt>Gross payout</dt>
                    <dd>{formatSheetMoney(sheet.computed?.grossPayout)}</dd>
                  </div>
                  <div>
                    <dt>Deductions</dt>
                    <dd>{formatSheetMoney(sheet.computed?.deductions)}</dd>
                  </div>
                  <div>
                    <dt>Net payable</dt>
                    <dd>{formatSheetMoney(sheet.computed?.netPayable)}</dd>
                  </div>
                </dl>
              </section>

              <FinalizePreflightPanel
                blockers={preflightQuery.data?.blockers}
                ready={preflightQuery.data?.ready}
                finalPayable={preflightQuery.data?.finalPayable}
              />

              {artistId ? (
                <ArtistRollupPanel rollup={rollupQuery.data} loading={rollupQuery.isLoading} />
              ) : null}

              {outcome.kind === 'success' ? (
                <div className="block-settlement-page__success" data-testid="finalize-success">
                  <p>Settlement finalized.</p>
                  {outcome.pdfUrl ? (
                    <a href={outcome.pdfUrl} data-testid="settlement-pdf-link">
                      View settlement PDF
                    </a>
                  ) : null}
                </div>
              ) : null}

              {outcome.kind === 'failure' ? (
                <div className="block-settlement-page__failure banner-error" data-testid="finalize-failure">
                  Finalization failed during <strong>{outcome.step}</strong>: {outcome.message}
                </div>
              ) : null}

              {!isFinalized ? (
                <div className="block-settlement-page__actions">
                  {!online ? (
                    <p className="block-settlement-page__offline" data-testid="finalize-offline-message">
                      You are offline. Connect to the network before finalizing.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn-primary block-settlement-page__finalize"
                    data-testid="finalize-settlement"
                    disabled={!online || !preflightQuery.data?.ready || finalizeMutation.isPending}
                    onClick={() => void handleFinalize()}
                  >
                    Finalize settlement
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReopenOpen(true)}
                >
                  Reopen settlement
                </button>
              )}
            </>
          ) : null}
        </main>
      ) : (
        <p className="block-settlement-page__empty">Select a block from your work queue.</p>
      )}

      <ReopenDialog
        open={reopenOpen}
        requiresDispatchAcknowledgement={
          sheet?.revisions?.some((revision) => revision.dispatchOutcome === 'DISPATCHED') ?? false
        }
        pending={reopenMutation.isPending}
        onClose={() => setReopenOpen(false)}
        onConfirm={(payload) => {
          void reopenMutation
            .mutateAsync(payload)
            .then(() => {
              setReopenOpen(false);
              setOutcome({ kind: 'idle' });
            });
        }}
      />
    </div>
  );
}
