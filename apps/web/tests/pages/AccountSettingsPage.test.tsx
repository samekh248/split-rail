import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { DEFAULT_DATE_DISPLAY_FORMAT, setDateDisplayFormat } from '@/lib/dateDisplayFormat';
import { DEFAULT_TIME_DISPLAY_FORMAT, setTimeDisplayFormat } from '@/lib/timeDisplayFormat';

const mockUpdate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/user', () => ({
  useUserProfile: () => ({
    data: {
      dateDisplayFormat: DEFAULT_DATE_DISPLAY_FORMAT,
      timeDisplayFormat: DEFAULT_TIME_DISPLAY_FORMAT,
    },
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
    setTimeDisplayFormat(DEFAULT_TIME_DISPLAY_FORMAT);
    mockUpdate.mutateAsync.mockResolvedValue({
      dateDisplayFormat: 'yyyy-MM-dd',
      timeDisplayFormat: '24h',
    });
  });

  it('shows the date and time display format pickers', () => {
    render(<AccountSettingsPage />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Date display format')).toBeInTheDocument();
    expect(screen.getByTestId('account-date-display-format')).toHaveTextContent('MM/dd/YYYY');
    expect(screen.getByLabelText('Time display format')).toBeInTheDocument();
    expect(screen.getByTestId('account-time-display-format')).toHaveTextContent('12-hour');
  });

  it('saves the selected display preferences', async () => {
    const user = userEvent.setup();
    render(<AccountSettingsPage />, { wrapper: createWrapper() });

    await user.click(screen.getByTestId('account-date-display-format'));
    await user.click(screen.getByTestId('account-date-display-format-option-yyyy-MM-dd'));
    await user.click(screen.getByTestId('account-time-display-format'));
    await user.click(screen.getByTestId('account-time-display-format-option-24h'));
    await user.click(screen.getByTestId('account-settings-save'));

    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
        dateDisplayFormat: 'yyyy-MM-dd',
        timeDisplayFormat: '24h',
      });
    });
    expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
  });
});
