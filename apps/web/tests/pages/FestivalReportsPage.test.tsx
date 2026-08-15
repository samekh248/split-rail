import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FestivalReportsPage } from '@/pages/FestivalReportsPage';

vi.mock('@/api/festivalReports', () => ({
  useFestivalPnlReport: () => ({ data: { net: 1200 }, isLoading: false }),
  useFestivalDayReport: () => ({
    data: { days: [{ dayDate: '2026-08-14', blockIds: ['block-1'] }] },
    isLoading: false,
  }),
  useFestivalStageReport: () => ({ data: { stages: [{ blockIds: ['block-1'] }] }, isLoading: false }),
  useFestivalSettlementStatusReport: () => ({ data: { byStatus: [] }, isLoading: false }),
  useFestivalUnreconciledReport: () => ({ data: { transactions: [{ txId: 'tx-1' }] }, isLoading: false }),
  useFestivalVarianceReport: () => ({
    data: { rows: [{ blockIds: ['block-1'] }] },
    isLoading: false,
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FestivalReportsPage venueId="venue-1" eventId="event-1" />
    </QueryClientProvider>,
  );
}

describe('FestivalReportsPage', () => {
  it('renders all report layers with segmentation controls', () => {
    renderPage();

    expect(screen.getByTestId('festival-reports-page')).toBeInTheDocument();
    expect(screen.getByTestId('festival-report-cards')).toBeInTheDocument();
    expect(screen.getByTestId('report-category-filter')).toBeInTheDocument();
    expect(screen.getByTestId('report-status-filter')).toBeInTheDocument();
    expect(screen.getByText(/Festival P&L/i)).toBeInTheDocument();
    expect(screen.getByText(/Unreconciled expenses/i)).toBeInTheDocument();
  });

  it('provides working drill-down links', () => {
    renderPage();

    expect(screen.getByTestId('report-drill-ledger')).toHaveAttribute(
      'href',
      '/venues/venue-1/festivals/event-1/ledger',
    );
    expect(screen.getByTestId('report-drill-itinerary')).toHaveAttribute(
      'href',
      '/venues/venue-1/festivals/event-1/itinerary?day=2026-08-14',
    );
    expect(screen.getByTestId('report-drill-settlement')).toHaveAttribute(
      'href',
      '/venues/venue-1/festivals/event-1/blocks/block-1/settlement',
    );
  });

  it('updates category segmentation', () => {
    renderPage();
    fireEvent.change(screen.getByTestId('report-category-filter'), { target: { value: 'MUSIC' } });
    expect(screen.getByTestId('report-category-filter')).toHaveValue('MUSIC');
  });
});
