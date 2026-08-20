import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventLedgerPage } from '@/pages/EventLedgerPage';
import type { LedgerGridResponse } from '@/types/generated-api';
import type { WorkspaceFocus } from '@/lib/eventCardQuickLinks';

const scrollToWorkspaceFocusMock = vi.fn(() => true);

vi.mock('@/lib/workspaceFocusScroll', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workspaceFocusScroll')>();
  return {
    ...actual,
    scrollToWorkspaceFocus: (...args: Parameters<typeof actual.scrollToWorkspaceFocus>) =>
      scrollToWorkspaceFocusMock(...args),
  };
});

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
const pinMutate = vi.fn();
const unpinMutate = vi.fn();

vi.mock('@/api/ledger', () => ({
  useLedger: vi.fn(),
  useRecalculateLedger: vi.fn(() => ({ mutateAsync })),
  useUpdateLineItem: vi.fn(() => ({ mutateAsync })),
  useCreateLineItem: vi.fn(() => ({ mutateAsync })),
  useDeleteLineItem: vi.fn(() => ({ mutateAsync })),
  useLockBudget: vi.fn(() => ({ mutate, isPending: false })),
  useCreateArtist: vi.fn(() => ({ mutateAsync })),
  useUpdateArtist: vi.fn(() => ({ mutateAsync })),
  useDeleteArtist: vi.fn(() => ({ mutateAsync })),
}));

vi.mock('@/api/events', () => ({
  useEvents: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/api/dashboard', () => ({
  usePinEvent: vi.fn(() => ({ mutate: pinMutate })),
  useUnpinEvent: vi.fn(() => ({ mutate: unpinMutate })),
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
import { useEvents } from '@/api/events';
import { useCanEditLedgerStructure } from '@/hooks/useCanEditLedgerStructure';
import { useCanTriggerQboSync } from '@/api/user';

function renderPage(focus?: WorkspaceFocus | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EventLedgerPage venueId="ven-1" eventId="evt-1" focus={focus} />
    </QueryClientProvider>,
  );
}

describe('EventLedgerPage', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(mockLedger);
    scrollToWorkspaceFocusMock.mockClear();
    pinMutate.mockClear();
    unpinMutate.mockClear();
    vi.mocked(useCanTriggerQboSync).mockReturnValue(false);
    vi.mocked(useEvents).mockReturnValue({ data: [] } as ReturnType<typeof useEvents>);
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

  it('updates an artist via useUpdateArtist and recalculates', async () => {
    const user = userEvent.setup();
    const artist = {
      id: 'artist-1',
      artistName: 'Headliner',
      performanceOrder: 1,
      dealType: 'guarantee' as const,
      customFormulaExpression: null,
      baseGuarantee: '5000.00',
      backendPercentage: '70.00',
      taxWithholdingPercentage: '0.00',
      calculatedNetPayout: '7000.00',
      rowVersion: 'v1',
    };

    vi.mocked(useCanEditLedgerStructure).mockReturnValue(true);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: { ...mockLedger, artists: [artist] },
    } as ReturnType<typeof useLedger>);

    renderPage();

    await user.click(screen.getByTestId('edit-artist-artist-1'));
    await user.clear(screen.getByTestId('base-guarantee-input'));
    await user.type(screen.getByTestId('base-guarantee-input'), '6000.00');
    await user.click(screen.getByTestId('save-artist-btn'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
  });

  it('scrolls to deal focus after ledger loads', async () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage('deal');

    await waitFor(() => {
      expect(scrollToWorkspaceFocusMock).toHaveBeenCalledWith('deal');
    });
  });

  it('scrolls to settlement focus after ledger loads', async () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage('settlement');

    await waitFor(() => {
      expect(scrollToWorkspaceFocusMock).toHaveBeenCalledWith('settlement');
    });
  });

  it('scrolls to signature focus when finalize panel is rendered', async () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: { ...mockLedger, isBudgetLocked: true, status: 'PRE_SHOW' },
    } as ReturnType<typeof useLedger>);

    renderPage('signature');

    await waitFor(() => {
      expect(scrollToWorkspaceFocusMock).toHaveBeenCalledWith('signature');
    });
  });

  it('scrolls to variance focus without error when banner is absent', async () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage('variance');

    await waitFor(() => {
      expect(scrollToWorkspaceFocusMock).toHaveBeenCalledWith('variance');
    });
    expect(screen.getByTestId('event-ledger-page')).toBeInTheDocument();
  });

  it('scrolls to sync focus after ledger loads', async () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage('sync');

    await waitFor(() => {
      expect(scrollToWorkspaceFocusMock).toHaveBeenCalledWith('sync');
    });
    expect(screen.getByTestId('workspace-focus-sync')).toBeInTheDocument();
  });

  it('places Sync Now in the ledger hero and omits the floating toolbar', () => {
    vi.mocked(useCanTriggerQboSync).mockReturnValue(true);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();

    expect(document.querySelector('.event-ledger-page__toolbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('sync-now-button').closest('.section-header__actions')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-focus-sync')).toBeInTheDocument();
  });

  it('omits Sync Now without leaving an empty toolbar when sync is not permitted', () => {
    vi.mocked(useCanTriggerQboSync).mockReturnValue(false);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();

    expect(screen.queryByTestId('sync-now-button')).not.toBeInTheDocument();
    expect(document.querySelector('.event-ledger-page__toolbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-focus-sync')).toBeInTheDocument();
  });

  it('does not scroll when focus is null or invalid', async () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage(null);

    await waitFor(() => {
      expect(screen.getByTestId('event-ledger-page')).toBeInTheDocument();
    });
    expect(scrollToWorkspaceFocusMock).not.toHaveBeenCalled();
  });

  it('does not scroll while ledger is loading even with focus', () => {
    vi.mocked(useLedger).mockReturnValue({
      isLoading: true,
      error: null,
      data: undefined,
    } as ReturnType<typeof useLedger>);

    renderPage('deal');
    expect(scrollToWorkspaceFocusMock).not.toHaveBeenCalled();
  });

  it('renders inline pin on the event meta row for standard events', () => {
    vi.mocked(useEvents).mockReturnValue({
      data: [{ eventId: 'evt-1', venueId: 'ven-1', isPinned: false }],
    } as ReturnType<typeof useEvents>);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();

    expect(screen.getByTestId('ledger-event-meta')).toBeInTheDocument();
    expect(screen.getByTestId('ledger-pin-evt-1')).toHaveClass('event-card__pin');
  });

  it('calls pin mutation when the ledger meta pin is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useEvents).mockReturnValue({
      data: [{ eventId: 'evt-1', venueId: 'ven-1', isPinned: false }],
    } as ReturnType<typeof useEvents>);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    renderPage();

    await user.click(screen.getByTestId('ledger-pin-evt-1'));
    expect(pinMutate).toHaveBeenCalledWith({ venueId: 'ven-1', eventId: 'evt-1' });
  });

  it('omits inline pin when hideEventHeader is true', () => {
    vi.mocked(useEvents).mockReturnValue({
      data: [{ eventId: 'evt-1', venueId: 'ven-1', isPinned: false }],
    } as ReturnType<typeof useEvents>);
    vi.mocked(useLedger).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockLedger,
    } as ReturnType<typeof useLedger>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <EventLedgerPage venueId="ven-1" eventId="evt-1" hideEventHeader />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('ledger-event-meta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ledger-pin-evt-1')).not.toBeInTheDocument();
  });
});
