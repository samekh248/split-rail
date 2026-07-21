import { useState } from 'react';
import { openSettlementPdfUrl, useSettlementPdfLink } from '@/api/settlement';

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
  const [openError, setOpenError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  if (!showBanner) {
    return null;
  }

  const openPdf = async () => {
    setOpenError(null);
    setIsOpening(true);
    try {
      let link = pdfLink;
      if (!link?.url) {
        const refreshed = await refetch();
        if (refreshed.error) {
          throw refreshed.error;
        }
        link = refreshed.data;
      }

      if (!link?.url) {
        setOpenError('Settlement PDF is not available.');
        return;
      }

      await openSettlementPdfUrl(link.url);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Failed to open settlement PDF.');
    } finally {
      setIsOpening(false);
    }
  };

  const isBusy = isFetching || isOpening;

  return (
    <div className="settlement-locked-banner" data-testid="settlement-locked-banner" role="status">
      <strong>Settled / Locked</strong>
      <span>This event is frozen. Ledger edits are read-only.</span>
      <button
        type="button"
        data-testid="settlement-pdf-link"
        disabled={isBusy}
        onClick={() => void openPdf()}
      >
        {isBusy ? 'Loading PDF…' : 'View Settlement PDF'}
      </button>
      {openError && (
        <p role="alert" data-testid="settlement-pdf-error">
          {openError}
        </p>
      )}
    </div>
  );
}
