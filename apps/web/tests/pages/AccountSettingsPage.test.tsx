import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { DEFAULT_DATE_DISPLAY_FORMAT, setDateDisplayFormat } from '@/lib/dateDisplayFormat';

const mockUpdate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/user', () => ({
  useUserProfile: () => ({
    data: { dateDisplayFormat: DEFAULT_DATE_DISPLAY_FORMAT },
    isLoading: false,
  }),
  useUpdateUserPreferences: () => mockUpdate,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDateDisplayFormat(DEFAULT_DATE_DISPLAY_FORMAT);
    mockUpdate.mutateAsync.mockResolvedValue({ dateDisplayFormat: 'yyyy-MM-dd' });
  });

  it('shows the date display format picker', () => {
    render(<AccountSettingsPage />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Date display format')).toBeInTheDocument();
    expect(screen.getByTestId('account-date-display-format')).toHaveTextContent('MM/dd/YYYY');
  });

  it('saves the selected date display format', async () => {
    const user = userEvent.setup();
    render(<AccountSettingsPage />, { wrapper: createWrapper() });

    await user.click(screen.getByTestId('account-date-display-format'));
    await user.click(screen.getByTestId('account-date-display-format-option-yyyy-MM-dd'));
    await user.click(screen.getByTestId('account-settings-save'));

    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({ dateDisplayFormat: 'yyyy-MM-dd' });
    });
    expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
  });
});
