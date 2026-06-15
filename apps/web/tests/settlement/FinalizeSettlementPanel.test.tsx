import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FinalizeSettlementPanel } from '@/components/settlement/FinalizeSettlementPanel';

const mutateAsync = vi.fn();

vi.mock('@/api/settlement', () => ({
  useFinalizeSettlement: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/api/user', () => ({
  useCanSignSettlement: () => true,
}));

vi.mock('@/components/settlement/SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange?: (value: string | null) => void }) => (
    <button
      type="button"
      data-testid="mock-sign"
      onClick={() => onChange?.(btoa('[[{"x":1,"y":2}]]'))}
    >
      Sign
    </button>
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
});
