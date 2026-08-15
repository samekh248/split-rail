import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  useFestivalDayReport,
  useFestivalPnlReport,
  useFestivalSettlementStatusReport,
  useFestivalStageReport,
  useFestivalUnreconciledReport,
  useFestivalVarianceReport,
} from '@/api/festivalReports';
import { ReportCards } from '@/components/festival/ReportCards';
import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';

export interface FestivalReportsPageProps {
  venueId: string;
  eventId: string;
}

export function FestivalReportsPage({ venueId, eventId }: FestivalReportsPageProps) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filters = useMemo(
    () => ({ category: categoryFilter || undefined, status: statusFilter || undefined }),
    [categoryFilter, statusFilter],
  );

  const pnlQuery = useFestivalPnlReport(venueId, eventId, categoryFilter || undefined);
  const dayQuery = useFestivalDayReport(venueId, eventId, filters);
  const stageQuery = useFestivalStageReport(venueId, eventId, filters);
  const settlementQuery = useFestivalSettlementStatusReport(venueId, eventId, categoryFilter || undefined);
  const unreconciledQuery = useFestivalUnreconciledReport(venueId, eventId);
  const varianceQuery = useFestivalVarianceReport(venueId, eventId, filters);

  const loading =
    pnlQuery.isLoading ||
    dayQuery.isLoading ||
    stageQuery.isLoading ||
    settlementQuery.isLoading ||
    unreconciledQuery.isLoading ||
    varianceQuery.isLoading;

  const firstDay = dayQuery.data?.days?.[0]?.dayDate;
  const firstBlock =
    dayQuery.data?.days?.[0]?.blockIds?.[0] ??
    stageQuery.data?.stages?.[0]?.blockIds?.[0] ??
    varianceQuery.data?.rows?.[0]?.blockIds?.[0];

  return (
    <div className="festival-reports-page" data-testid="festival-reports-page">
      <header className="festival-reports-page__header">
        <button
          type="button"
          className="btn-icon-label"
          onClick={() => navigateToEventWorkspace(venueId, eventId)}
        >
          <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
          Back to event
        </button>
        <h1>Festival reports</h1>
      </header>

      {loading ? (
        <p role="status">Loading reports…</p>
      ) : (
        <ReportCards
          venueId={venueId}
          eventId={eventId}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          pnlNet={pnlQuery.data?.net?.toString()}
          dayCount={dayQuery.data?.days?.length ?? 0}
          stageCount={stageQuery.data?.stages?.length ?? 0}
          unreconciledCount={unreconciledQuery.data?.transactions?.length ?? 0}
          varianceRows={varianceQuery.data?.rows?.length ?? 0}
          drillDay={firstDay ?? undefined}
          drillBlockId={firstBlock ?? undefined}
        />
      )}
    </div>
  );
}
