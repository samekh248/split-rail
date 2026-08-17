import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinalizeSettlementPanel } from '@/components/settlement/FinalizeSettlementPanel';

const mutateAsync = vi.fn();
let canSign = true;
let isPending = false;
let isError = false;
let errorMessage = '';

vi.mock('@/api/settlement', () => ({
  useFinalizeSettlement: () => ({
    mutateAsync,
    isPending,
    isError,
    error: isError ? { message: errorMessage } : null,
  }),
}));

vi.mock('@/api/user', () => ({
  useCanSignSettlement: () => canSign,
}));

vi.mock('@/components/settlement/SignaturePad', () => ({
  SignaturePad: ({
    onChange,
    disabled,
  }: {
    onChange?: (value: string | null) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="signature-pad" data-disabled={String(!!disabled)}>
      <button
        type="button"
        data-testid="mock-sign"
        disabled={disabled}
        onClick={() => onChange?.(btoa('[[{"x":1,"y":2}]]'))}
      >
        Sign
      </button>
    </div>
  ),
}));

function renderPanel() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <FinalizeSettlementPanel venueId="ven-1" eventId="evt-1" />
    </QueryClientProvider>,
  );
}

describe('FinalizeSettlementPanel', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
    canSign = true;
    isPending = false;
    isError = false;
    errorMessage = '';
  });

  it('requires confirmation before finalize', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByTestId('mock-sign'));
    const btn = screen.getByTestId('finalize-settlement-btn');
    expect(btn).toBeDisabled();

    await user.click(screen.getByTestId('finalize-confirm-checkbox'));
    expect(btn).toBeEnabled();
  });

  it('calls finalize mutation with signature payload', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByTestId('mock-sign'));
    await user.click(screen.getByTestId('finalize-confirm-checkbox'));
    await user.click(screen.getByTestId('finalize-settlement-btn'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        signatureData: btoa('[[{"x":1,"y":2}]]'),
        confirmed: true,
      });
    });
  });

  it('uses shared primary button styling', () => {
    renderPanel();
    const btn = screen.getByTestId('finalize-settlement-btn');
    expect(btn).toHaveClass('btn-primary');
    expect(btn.closest('.section-header__actions')).toBeInTheDocument();
    expect(btn.compareDocumentPosition(screen.getByTestId('finalize-confirm-checkbox'))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  it('is not rendered when user lacks sign permission', () => {
    canSign = false;
    renderPanel();
    expect(screen.queryByTestId('finalize-settlement-panel')).not.toBeInTheDocument();
  });

  it('disables signature pad while finalize is pending', () => {
    isPending = true;
    renderPanel();
    expect(screen.getByTestId('signature-pad')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('mock-sign')).toBeDisabled();
  });

  it('shows finalize error message when mutation fails', () => {
    isError = true;
    errorMessage = 'Settlement failed';
    renderPanel();
    expect(screen.getByTestId('finalize-error')).toHaveTextContent('Settlement failed');
  });
});
