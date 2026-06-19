import type { VenueQboStatusDto } from '@/types/generated-api';

export interface VenueQboStatusCardProps {
  status: VenueQboStatusDto | undefined;
  isLoading: boolean;
}

function formatSyncedAt(value: string | null | undefined): string {
  if (!value) {
    return 'Never synced';
  }
  return new Date(value).toLocaleString();
}

export function VenueQboStatusCard({ status, isLoading }: VenueQboStatusCardProps) {
  if (isLoading) {
    return (
      <section className="venue-qbo-status-card" data-testid="venue-qbo-status-card" aria-busy="true">
        <p>Loading QuickBooks status…</p>
      </section>
    );
  }

  const connected = status?.qboConnected ?? false;

  return (
    <section className="venue-qbo-status-card" data-testid="venue-qbo-status-card">
      <h2 className="venue-qbo-status-card__title">QuickBooks connection</h2>
      <p className="venue-qbo-status-card__status" data-testid="venue-qbo-status-connected">
        {connected ? 'Connected' : 'Not connected'}
      </p>
      {connected ? (
        <p className="venue-qbo-status-card__meta">
          Last synced: {formatSyncedAt(status?.lastSyncedAt)}
        </p>
      ) : (
        <p className="venue-qbo-status-card__guidance">
          Connect QuickBooks in venue settings before sync data is available.
        </p>
      )}
    </section>
  );
}
