import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceholderSettingsPage } from '@/pages/PlaceholderSettingsPage';

vi.mock('@/hooks/useCanManageTeam', () => ({
  useCanManageTeam: () => true,
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('PlaceholderSettingsPage', () => {
  it('renders coming soon copy with title', () => {
    render(<PlaceholderSettingsPage title="Integrations" />, { wrapper });

    expect(screen.getByRole('heading', { name: 'Coming soon' })).toBeInTheDocument();
    expect(screen.getByText(/Integrations settings are not available yet/)).toBeInTheDocument();
  });
});
