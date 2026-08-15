import { formatMoney } from '@/lib/money';
import type { ArtistSettlementRollupDto } from '@/types/generated-api';

export interface ArtistRollupPanelProps {
  rollup: ArtistSettlementRollupDto | undefined;
  loading?: boolean;
}

export function ArtistRollupPanel({ rollup, loading = false }: ArtistRollupPanelProps) {
  if (loading) {
    return <p className="artist-rollup-panel__loading">Loading artist rollup…</p>;
  }

  if (!rollup) {
    return null;
  }

  return (
    <section className="artist-rollup-panel" data-testid="artist-rollup-panel">
      <header className="artist-rollup-panel__header">
        <h2 className="artist-rollup-panel__title">{rollup.artistName}</h2>
        <p className="artist-rollup-panel__summary">
          {rollup.appearanceCount} appearances · {formatMoney(rollup.totalNetPayout)} paid ·{' '}
          {formatMoney(rollup.totalAllocatedRevenue)} allocated
        </p>
      </header>
      <ul className="artist-rollup-panel__list">
        {(rollup.appearances ?? []).map((appearance) => (
          <li key={appearance.blockId} className="artist-rollup-panel__item">
            <div>
              <strong>{appearance.title}</strong>
              <span>
                {appearance.dayDate} · {appearance.stageName}
              </span>
            </div>
            <div className="artist-rollup-panel__status">
              <span data-testid={`appearance-status-${appearance.blockId}`}>
                {appearance.settlementStatus}
              </span>
              {appearance.netPayable != null ? (
                <span>{formatMoney(appearance.netPayable)}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
