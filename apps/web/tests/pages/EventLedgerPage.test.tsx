import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
    { blockType: 'EXPENSES', rows: [], blockTotals: {} },
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
  useCreateLineItem: vi.fn(() => ({ mutate })),
  useLockBudget: vi.fn(() => ({ mutate, isPending: false })),
  useCreateArtist: vi.fn(() => ({ mutateAsync })),
  useDeleteArtist: vi.fn(() => ({ mutateAsync })),
}));

vi.mock('@/api/user', () => ({
  useCanTriggerQboSync: vi.fn(() => false),
  useCanSignSettlement: vi.fn(() => true),
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

  it('creates a sample expense row from dev tools', async () => {
    const user = userEvent.setup();
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();
    await user.click(screen.getByTestId('add-sample-row-btn'));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        blockType: 'EXPENSES',
        rowLabel: 'New expense',
      }),
    );
  });
});
