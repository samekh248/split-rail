import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettlementLockedBanner } from '@/components/settlement/SettlementLockedBanner';
import type { SettlementPdfLinkDto } from '@/types/generated-api';

const refetch = vi.fn().mockResolvedValue({
  data: { url: 'https://storage.test/settlement.pdf', expiresAt: '2026-06-15T12:00:00Z' },
});

const pdfLinkState: { data: SettlementPdfLinkDto | undefined } = {
  data: { url: 'https://storage.test/settlement.pdf', expiresAt: '2026-06-15T12:00:00Z' },
};

vi.mock('@/api/settlement', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/settlement')>();
  return {
    ...actual,
    useSettlementPdfLink: () => ({
      data: pdfLinkState.data,
      refetch,
      isFetching: false,
    }),
  };
});

describe('SettlementLockedBanner', () => {
  it('renders when status is SETTLED with PDF available', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="SETTLED"
          settlementPdfAvailable
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('settlement-locked-banner')).toHaveTextContent('Settled / Locked');
    expect(screen.getByTestId('settlement-pdf-link')).toBeInTheDocument();
  });

  it('is hidden when not settled', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="PRE_SHOW"
          settlementPdfAvailable={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('settlement-locked-banner')).not.toBeInTheDocument();
  });

  it('opens PDF link in new tab', async () => {
    pdfLinkState.data = {
      url: 'https://storage.test/settlement.pdf',
      expiresAt: '2026-06-15T12:00:00Z',
    };
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="SETTLED"
          settlementPdfAvailable
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('settlement-pdf-link'));
    expect(clickSpy).toHaveBeenCalled();
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.href).toBe('https://storage.test/settlement.pdf');

    clickSpy.mockRestore();
  });

  it('fetches same-origin API PDF links with auth before opening', async () => {
    pdfLinkState.data = undefined;
    refetch.mockResolvedValueOnce({
      data: {
        url: '/api/venues/ven-1/events/evt-1/settlement-pdf/file',
        expiresAt: '2026-06-15T12:00:00Z',
      },
    });

    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectUrlSpy = vi.fn().mockReturnValue('blob:test-pdf');
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrlSpy,
      revokeObjectURL: vi.fn(),
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['%PDF'], { type: 'application/pdf' }), { status: 200 }),
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="SETTLED"
          settlementPdfAvailable
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('settlement-pdf-link'));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/venues/ven-1/events/evt-1/settlement-pdf/file',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(clickSpy).toHaveBeenCalled();
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.href).toBe('blob:test-pdf');

    fetchSpy.mockRestore();
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('shows an error when the PDF link cannot be opened', async () => {
    pdfLinkState.data = undefined;
    refetch.mockResolvedValueOnce({ data: undefined, error: null });

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettlementLockedBanner
          venueId="ven-1"
          eventId="evt-1"
          status="SETTLED"
          settlementPdfAvailable
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTestId('settlement-pdf-link'));
    expect(screen.getByTestId('settlement-pdf-error')).toHaveTextContent(
      'Settlement PDF is not available.',
    );
  });
});
