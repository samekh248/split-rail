import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '@/App';

vi.mock('@/pages/EventLedgerPage', () => ({
  EventLedgerPage: ({ venueId, eventId }: { venueId: string; eventId: string }) => (
    <div data-testid="mock-ledger-page">
      {venueId}:{eventId}
    </div>
  ),
}));

describe('App', () => {
  it('renders the shell and passes route params to the ledger page', () => {
    window.history.pushState({}, '', '/?venueId=ven-123&eventId=evt-456');

    render(<App />);

    expect(screen.getByText('Split Rail')).toBeInTheDocument();
    expect(screen.getByText('Event Financial Ledger')).toBeInTheDocument();
    expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent('ven-123:evt-456');
  });

  it('falls back to default ids when query params are missing', () => {
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(screen.getByTestId('mock-ledger-page')).toHaveTextContent(
      '00000000-0000-0000-0000-000000000001:00000000-0000-0000-0000-000000000002',
    );
  });
});
