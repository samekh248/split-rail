import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerGrid } from '@/components/ledger/LedgerGrid';
import type { LedgerGridResponse } from '@/types/generated-api';
import { DEFAULT_DATE_DISPLAY_FORMAT, setDateDisplayFormat } from '@/lib/dateDisplayFormat';

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
          hasQboCorrection: false,
        },
      ],
      blockTotals: { proforma: '10000.00', settlement: '0.00', qboActual: '0.00' },
    },
    {
      blockType: 'EXPENSES',
      rows: [],
      blockTotals: {},
    },
    {
      blockType: 'DEAL_MATH',
      rows: [],
      blockTotals: {},
    },
  ],
  artists: [
    {
      id: 'artist-1',
      artistName: 'The Headliner',
      performanceOrder: 1,
      dealType: 'guarantee',
      customFormulaExpression: null,
      baseGuarantee: '5000.00',
      backendPercentage: '70.00',
      taxWithholdingPercentage: '0.00',
      calculatedNetPayout: '5000.00',
      rowVersion: 'v1',
    },
  ],
  summary: {
    grossRevenue: '10000.00',
    totalDeductions: '0.00',
    netShowRevenue: '10000.00',
  },
};

describe('LedgerGrid', () => {
  beforeEach(() => {
    setDateDisplayFormat(DEFAULT_DATE_DISPLAY_FORMAT);
  });

  it('renders event meta with formatted date', () => {
    render(<LedgerGrid ledger={mockLedger} />);

    expect(screen.getByTestId('ledger-event-meta')).toHaveTextContent('07/04/2026 · PRE-SHOW');
  });

  it('renders all three block sections', () => {
    render(<LedgerGrid ledger={mockLedger} />);

    expect(screen.getByTestId('block-REVENUE')).toBeInTheDocument();
    expect(screen.getByTestId('block-EXPENSES')).toBeInTheDocument();
    expect(screen.getByTestId('block-DEAL_MATH')).toBeInTheDocument();
  });

  it('shows proforma as editable input in planning state', () => {
    render(<LedgerGrid ledger={mockLedger} />);

    expect(screen.getByTestId('proforma-row-1')).toBeInTheDocument();
    expect(screen.queryByTestId('proforma-readonly-row-1')).not.toBeInTheDocument();
  });

  it('renders summary stat cards', () => {
    render(<LedgerGrid ledger={mockLedger} />);

    expect(screen.getByRole('heading', { name: 'Summary', level: 3 })).toBeInTheDocument();
    const summary = screen.getByTestId('ledger-summary');
    expect(summary).toBeInTheDocument();
    expect(within(summary).getByText('Gross')).toBeInTheDocument();
    expect(within(summary).getByText('Deductions')).toBeInTheDocument();
    expect(within(summary).getByText('$0.00')).toBeInTheDocument();
  });

  it('calls onProformaChange when proforma input blurs', async () => {
    const user = userEvent.setup();
    const onProformaChange = vi.fn();

    render(
      <LedgerGrid ledger={mockLedger} onProformaChange={onProformaChange} />,
    );

    const input = screen.getByTestId('proforma-row-1');
    await user.clear(input);
    await user.type(input, '12000');
    await user.tab();

    expect(onProformaChange).toHaveBeenCalledWith('row-1', '12000.00');
  });

  it('shows lock budget button when budget is unlocked', async () => {
    const user = userEvent.setup();
    const onLockBudget = vi.fn();

    render(
      <LedgerGrid ledger={mockLedger} onLockBudget={onLockBudget} />,
    );

    await user.click(screen.getByTestId('lock-budget-btn'));
    expect(onLockBudget).toHaveBeenCalled();
  });

  it('renders injected Sync Now in the hero action cluster with Lock Budget', () => {
    render(
      <LedgerGrid
        ledger={mockLedger}
        headerActions={<button type="button" data-testid="sync-now-button">Sync Now</button>}
      />,
    );

    const cluster = screen.getByTestId('sync-now-button').closest('.section-header__actions');
    expect(cluster).toBeInTheDocument();
    expect(cluster).toContainElement(screen.getByTestId('lock-budget-btn'));
    expect(screen.getByTestId('workspace-focus-sync')).toBeInTheDocument();
  });

  it('renders trailing header actions after Lock Budget', () => {
    render(
      <LedgerGrid
        ledger={mockLedger}
        headerActions={<button type="button" data-testid="sync-now-button">Sync Now</button>}
        trailingHeaderActions={
          <button type="button" data-testid="festival-convert-menu-trigger">More</button>
        }
      />,
    );

    const cluster = screen.getByTestId('sync-now-button').closest('.section-header__actions');
    expect(cluster).toBeInTheDocument();

    const buttons = cluster!.querySelectorAll('button');
    expect(buttons[0]).toHaveAttribute('data-testid', 'sync-now-button');
    expect(buttons[1]).toHaveAttribute('data-testid', 'lock-budget-btn');
    expect(buttons[2]).toHaveAttribute('data-testid', 'festival-convert-menu-trigger');
  });

  it('omits the action cluster when neither Sync Now nor Lock Budget is shown', () => {
    render(
      <LedgerGrid ledger={{ ...mockLedger, isBudgetLocked: true, status: 'SETTLED' }} />,
    );

    expect(screen.queryByTestId('lock-budget-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sync-now-button')).not.toBeInTheDocument();
    expect(document.querySelector('.section-header__actions')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-focus-sync')).toBeInTheDocument();
  });

  it('hides the event title and meta when hideEventHeader is true', () => {
    render(<LedgerGrid ledger={mockLedger} hideEventHeader />);

    expect(screen.queryByRole('heading', { name: 'Friday Headliner' })).not.toBeInTheDocument();
    expect(screen.queryByText(/07\/04\/2026 · PRE-SHOW/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Summary', level: 3 })).toBeInTheDocument();
    expect(screen.getByTestId('ledger-summary')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-focus-sync')).toHaveClass('ledger-grid__summary-header');
  });

  it('shows variance banner when reconciled rows have non-zero derived variance', () => {
    const ledgerWithVariance: LedgerGridResponse = {
      ...mockLedger,
      status: 'RECONCILED',
      blocks: [
        {
          ...mockLedger.blocks[0],
          rows: [
            {
              ...mockLedger.blocks[0].rows[0],
              qboActualValue: '10100.00',
              settlementValue: '10000.00',
              variance: '100.00',
              varianceFlagged: true,
            },
          ],
        },
        mockLedger.blocks[1],
        mockLedger.blocks[2],
      ],
    };

    render(<LedgerGrid ledger={ledgerWithVariance} />);
    expect(screen.getByTestId('variance-banner')).toBeInTheDocument();
  });

  it('shows variance banner when derived variance is non-zero even if varianceFlagged is false', () => {
    const ledgerWithDerivedOnly: LedgerGridResponse = {
      ...mockLedger,
      status: 'RECONCILED',
      blocks: [
        {
          ...mockLedger.blocks[0],
          rows: [
            {
              ...mockLedger.blocks[0].rows[0],
              qboActualValue: '50.00',
              settlementValue: '0.00',
              variance: '50.00',
              varianceFlagged: false,
            },
          ],
        },
        mockLedger.blocks[1],
        mockLedger.blocks[2],
      ],
    };

    render(<LedgerGrid ledger={ledgerWithDerivedOnly} />);
    expect(screen.getByTestId('variance-banner')).toBeInTheDocument();
  });
});
