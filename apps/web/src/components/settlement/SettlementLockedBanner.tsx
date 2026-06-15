import { useSettlementPdfLink } from '@/api/settlement';

interface SettlementLockedBannerProps {
  venueId: string;
  eventId: string;
  status: string;
  settlementPdfAvailable?: boolean;
}

export function SettlementLockedBanner({
  venueId,
  eventId,
  status,
  settlementPdfAvailable = false,
}: SettlementLockedBannerProps) {
  const showBanner = status === 'SETTLED' && settlementPdfAvailable;
  const { data: pdfLink, refetch, isFetching } = useSettlementPdfLink(
    venueId,
    eventId,
    showBanner,
  );

  if (!showBanner) {
    return null;
  }

  const openPdf = async () => {
    const result = pdfLink ?? (await refetch()).data;
    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="settlement-locked-banner" data-testid="settlement-locked-banner" role="status">
      <strong>Settled / Locked</strong>
      <span>This event is frozen. Ledger edits are read-only.</span>
      <button
        type="button"
        data-testid="settlement-pdf-link"
        disabled={isFetching}
        onClick={() => void openPdf()}
      >
        {isFetching ? 'Loading PDF…' : 'View Settlement PDF'}
      </button>
    </div>
  );
}
