import { useState } from 'react';
import { useFinalizeSettlement } from '@/api/settlement';
import { useCanSignSettlement } from '@/api/user';
import { SignaturePad } from './SignaturePad';

interface FinalizeSettlementPanelProps {
  venueId: string;
  eventId: string;
}

export function FinalizeSettlementPanel({
  venueId,
  eventId,
}: FinalizeSettlementPanelProps) {
  const canSign = useCanSignSettlement();
  const finalize = useFinalizeSettlement(venueId, eventId);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!canSign) {
    return null;
  }

  return (
    <section className="finalize-settlement-panel" data-testid="finalize-settlement-panel">
      <h3>Finalize Settlement</h3>
      <p>Draw the artist signature below, then confirm to freeze the event.</p>

      <SignaturePad onChange={setSignatureData} />

      <label className="finalize-settlement-panel__confirm">
        <input
          type="checkbox"
          data-testid="finalize-confirm-checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm this settlement is accurate and ready to freeze.
      </label>

      <button
        type="button"
        data-testid="finalize-settlement-btn"
        disabled={!signatureData || !confirmed || finalize.isPending}
        onClick={() => {
          if (!signatureData) return;
          void finalize.mutateAsync({ signatureData, confirmed: true });
        }}
      >
        {finalize.isPending ? 'Finalizing…' : 'Finalize Settlement'}
      </button>

      {finalize.isError && (
        <p role="alert" data-testid="finalize-error">
          {finalize.error.message}
        </p>
      )}
    </section>
  );
}
