import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import type { LedgerGridResponse } from '@/types/generated-api';

const mockLedger: LedgerGridResponse = {
  eventId: 'evt-1',
  venueId: 'ven-1',
  title: 'Friday Headliner',
  eventDate: '2026-07-04',
  status: 'PRE_SHOW',
  isBudgetLocked: false,
  qboTagName: 'EVENT-2026-07-04',
  editability: {
    proforma: 'editable',
    settlement: 'locked',
    qboActuals: 'locked',
  },
  blocks: [
    {
      blockType: 'REVENUE',
      rows: [
        {
          id: 'row-1',
          rowLabel: 'GA Tickets',
          sortOrder: 0,
          isArtistDeduction: false,
          proformaValue: '10000.00',
          settlementValue: '0.00',
          qboActualValue: '0.00',
          variance: '0.00',
          varianceFlagged: false,
          notes: null,
          isHiddenFromPromoter: false,
          rowVersion: 'v1',
        },
      ],
      blockTotals: { proforma: '10000.00', settlement: '0.00', qboActual: '0.00' },
    },
    { blockType: 'EXPENSES', rows: [
        {
          id: 'exp-1',
          rowLabel: 'Production',
          sortOrder: 0,
          isArtistDeduction: false,
          proformaValue: '2000.00',
          settlementValue: '0.00',
          qboActualValue: '0.00',
          variance: '0.00',
          varianceFlagged: false,
          notes: null,
          isHiddenFromPromoter: false,
          rowVersion: 'v1',
        },
      ], blockTotals: { proforma: '2000.00' } },
    { blockType: 'DEAL_MATH', rows: [], blockTotals: {} },
  ],
  artists: [],
  summary: {
    grossRevenue: '10000.00',
    totalDeductions: '0.00',
    netShowRevenue: '10000.00',
  },
};

const mutateAsync = vi.fn().mockResolvedValue(mockLedger);
const mutate = vi.fn();

vi.mock('@/api/ledger', () => ({
  useLedger: vi.fn(),
  useRecalculateLedger: vi.fn(() => ({ mutateAsync })),
  useUpdateLineItem: vi.fn(() => ({ mutateAsync })),
  useCreateLineItem: vi.fn(() => ({ mutateAsync })),
  useDeleteLineItem: vi.fn(() => ({ mutateAsync })),
  useLockBudget: vi.fn(() => ({ mutate, isPending: false })),
  useCreateArtist: vi.fn(() => ({ mutateAsync })),
  useDeleteArtist: vi.fn(() => ({ mutateAsync })),
}));

vi.mock('@/hooks/useCanEditLedgerStructure', () => ({
  useCanEditLedgerStructure: vi.fn(() => true),
}));

vi.mock('@/api/user', () => ({
  useCanTriggerQboSync: vi.fn(() => false),
  useCanSignSettlement: vi.fn(() => true),
  useUserProfile: vi.fn(() => ({ data: { role: { permissions: { canViewFinancials: true } } } })),
}));

vi.mock('@/api/qbo', () => ({
  useUnmappedCount: vi.fn(() => ({ data: { count: 0 } })),
  useUnmappedTransactions: vi.fn(() => ({ data: { transactions: [] } })),
  useCreateMapping: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useTriggerSync: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  qboKeys: {
    unmappedCount: () => ['qbo', 'count'],
    unmappedList: () => ['qbo', 'list'],
    syncStatus: () => ['qbo', 'status'],
  },
}));

vi.mock('@/api/settlement', () => ({
  useFinalizeSettlement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSettlementPdfLink: vi.fn(() => ({ data: null })),
  useReverseSettlement: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { useLedger } from '@/api/ledger';
import { useCanEditLedgerStructure } from '@/hooks/useCanEditLedgerStructure';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EventLedgerPage venueId="ven-1" eventId="evt-1" />
    </QueryClientProvider>,
  );
}

describe('EventLedgerPage', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(mockLedger);
  });

  it('shows loading state', () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: true,
      error: null,
      data: undefined,
    } as ReturnType<typeof useLedger>);

    renderPage();
    expect(screen.getByTestId('ledger-loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: new Error('404: Not Found'),
      data: undefined,
    } as ReturnType<typeof useLedger>);

    renderPage();
    expect(screen.getByTestId('ledger-error')).toHaveTextContent('404: Not Found');
  });

  it('renders the ledger page when data is available', () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();
    expect(screen.getByTestId('event-ledger-page')).toBeInTheDocument();
    expect(screen.getByTestId('ledger-grid')).toBeInTheDocument();
  });

  it('does not render the dev-only sample row button', () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();
    expect(screen.queryByTestId('add-sample-row-btn')).not.toBeInTheDocument();
  });

  it('shows add-row controls when structural editing is allowed', () => {
    vi.mocked(useCanEditLedgerStructure).mockReturnValue(true);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();
    expect(screen.getByTestId('add-row-REVENUE')).toBeInTheDocument();
    expect(screen.getByTestId('add-row-EXPENSES')).toBeInTheDocument();
  });

  it('hides structural controls when event is settled', () => {
    vi.mocked(useCanEditLedgerStructure).mockReturnValue(false);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: { ...mockLedger, status: 'SETTLED' },
    } as ReturnType<typeof useLedger>);

    renderPage();
    expect(screen.queryByTestId('add-row-REVENUE')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-row-row-1')).not.toBeInTheDocument();
  });

  it('shows structural error when deduction toggle save fails', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mutateAsync.mockRejectedValueOnce(new Error('409: Conflict'));

    vi.mocked(useCanEditLedgerStructure).mockReturnValue(true);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
      refetch,
    } as ReturnType<typeof useLedger>);

    renderPage();

    await user.click(screen.getByTestId('deduction-exp-1'));

    await waitFor(() => {
      expect(screen.getByTestId('structural-error')).toHaveTextContent('409: Conflict');
    });
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByTestId('deduction-exp-1')).not.toBeChecked();
  });
});
