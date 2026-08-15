import { buildBlockSettlementPath, buildFestivalItineraryPath, buildFestivalLedgerPath } from '@/lib/appRoute';

export interface ReportCardsProps {
  venueId: string;
  eventId: string;
  categoryFilter: string;
  statusFilter: string;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  pnlNet?: string;
  dayCount?: number;
  stageCount?: number;
  unreconciledCount?: number;
  varianceRows?: number;
  drillDay?: string;
  drillBlockId?: string;
}

const CATEGORY_OPTIONS = ['', 'MUSIC', 'VENDOR', 'EXHIBITION', 'EXPERIENCE'];
const STATUS_OPTIONS = ['', 'SCHEDULED', 'CANCELED', 'DELAYED', 'PARTIALLY_COMPLETED'];

export function ReportCards({
  venueId,
  eventId,
  categoryFilter,
  statusFilter,
  onCategoryChange,
  onStatusChange,
  pnlNet,
  dayCount = 0,
  stageCount = 0,
  unreconciledCount = 0,
  varianceRows = 0,
  drillDay,
  drillBlockId,
}: ReportCardsProps) {
  return (
    <div className="festival-report-cards" data-testid="festival-report-cards">
      <div className="festival-report-cards__filters">
        <label>
          Category
          <select
            data-testid="report-category-filter"
            value={categoryFilter}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option || 'all'} value={option}>
                {option || 'All categories'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            data-testid="report-status-filter"
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option || 'all'} value={option}>
                {option || 'All statuses'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="festival-report-cards__grid">
        <article className="festival-report-card">
          <h3>Festival P&amp;L</h3>
          <p>Net: ${pnlNet ?? '—'}</p>
          <a href={buildFestivalLedgerPath(venueId, eventId)} data-testid="report-drill-ledger">
            Open ledger
          </a>
        </article>

        <article className="festival-report-card">
          <h3>Day summaries</h3>
          <p>{dayCount} day rows</p>
          <a
            href={`${buildFestivalItineraryPath(venueId, eventId)}${drillDay ? `?day=${drillDay}` : ''}`}
            data-testid="report-drill-itinerary"
          >
            Drill to itinerary
          </a>
        </article>

        <article className="festival-report-card">
          <h3>Stage rollups</h3>
          <p>{stageCount} stages</p>
        </article>

        <article className="festival-report-card">
          <h3>Settlement status</h3>
          <p>Status segmentation enabled</p>
          {drillBlockId ? (
            <a
              href={buildBlockSettlementPath(venueId, eventId, drillBlockId)}
              data-testid="report-drill-settlement"
            >
              Open settlement
            </a>
          ) : null}
        </article>

        <article className="festival-report-card">
          <h3>Unreconciled expenses</h3>
          <p>{unreconciledCount} transactions</p>
        </article>

        <article className="festival-report-card">
          <h3>Variance</h3>
          <p>{varianceRows} segmented rows</p>
        </article>
      </div>
    </div>
  );
}
