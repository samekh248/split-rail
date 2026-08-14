import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockSettlementPage } from '@/pages/BlockSettlementPage';

const finalizeMock = vi.fn();

vi.mock('@/api/blockSettlements', () => ({
  useMySettlementBlocks: () => ({
    data: [
      {
        blockId: 'block-1',
        title: 'Headliner',
        dayDate: '2026-08-14',
        stageName: 'Main Stage',
        startTime: '20:00',
        settlementStatus: 'DRAFT',
        requiresSettlementReview: false,
        preflightReady: true,
      },
    ],
  }),
  useBlockSettlementSheet: () => ({
    data: {
      blockId: 'block-1',
      title: 'Headliner',
      dayDate: '2026-08-14',
      stageName: 'Main Stage',
      startTime: '20:00',
      endTime: '22:00',
      settlementStatus: 'DRAFT',
      requiresSettlementReview: false,
      dealTerms: {
        dealType: 'guarantee',
        baseGuarantee: '5000.00',
        backendPercentage: '0.00',
        percentBasis: 'GROSS',
        taxWithholdingPercentage: '0.00',
      },
      allocations: [],
      lineItems: [],
      computed: {
        allocationBasis: '10000.00',
        grossPayout: '10000.00',
        deductions: '0.00',
        taxWithheld: '0.00',
        netPayable: '10000.00',
      },
      revisions: [],
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useBlockSettlementPreflight: () => ({
    data: { ready: true, blockers: [], finalPayable: '10000.00' },
  }),
  useArtistSettlementRollup: () => ({ data: undefined, isLoading: false }),
  useFinalizeBlockSettlement: () => ({
    mutateAsync: finalizeMock,
    isPending: false,
  }),
  useReopenBlockSettlement: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
}

describe('BlockSettlementPage', () => {
  beforeEach(() => {
    finalizeMock.mockReset();
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
  });

  it('disables finalize when offline with a connectivity message', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });

    render(
      <BlockSettlementPage venueId="venue-1" eventId="fest-1" blockId="block-1" />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('finalize-offline-message')).toHaveTextContent(/offline/i);
    expect(screen.getByTestId('finalize-settlement')).toBeDisabled();
  });

  it('formats sheet money from decimal strings', () => {
    render(
      <BlockSettlementPage venueId="venue-1" eventId="fest-1" blockId="block-1" />,
      { wrapper: Wrapper },
    );

    expect(screen.getAllByText('$10,000.00')).not.toHaveLength(0);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByTestId('finalize-preflight')).toHaveTextContent('Net payable: $10,000.00');
  });

  it('shows finalized success with PDF link', async () => {
    finalizeMock.mockResolvedValue({
      settlementStatus: 'FINALIZED',
      pdfUrl: '/pdf/block-1.pdf',
    });

    render(
      <BlockSettlementPage venueId="venue-1" eventId="fest-1" blockId="block-1" />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('finalize-settlement'));
    await waitFor(() => {
      expect(screen.getByTestId('finalize-success')).toBeInTheDocument();
    });
    expect(screen.getByTestId('settlement-pdf-link')).toHaveAttribute('href', '/pdf/block-1.pdf');
  });

  it('shows failure banner and keeps draft state visible', async () => {
    finalizeMock.mockRejectedValue(new Error('document-dispatch failed'));

    render(
      <BlockSettlementPage venueId="venue-1" eventId="fest-1" blockId="block-1" />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('finalize-settlement'));
    await waitFor(() => {
      expect(screen.getByTestId('finalize-failure')).toHaveTextContent(/document-dispatch/i);
    });
    expect(screen.getByTestId('finalize-settlement')).toBeInTheDocument();
  });
});
