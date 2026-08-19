import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StageManagerPanel } from '@/components/festival/StageManagerPanel';

const mockStages = { data: [] as unknown[], isLoading: false };
const mockCreate = { mutateAsync: vi.fn(), isPending: false };
const mockDelete = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/api/festivals', () => ({
  useStages: () => mockStages,
  useCreateStage: () => mockCreate,
  useDeleteStage: () => mockDelete,
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const mainStage = { id: 'stage-1', name: 'Main Stage', sortOrder: 0, blockCount: 0 };
const rodeoStage = { id: 'stage-2', name: 'Rodeo Arena', sortOrder: 1, blockCount: 3 };

describe('StageManagerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStages.data = [mainStage];
    mockCreate.mutateAsync.mockResolvedValue(rodeoStage);
    mockDelete.mutateAsync.mockResolvedValue(undefined);
  });

  it('lists the festival stages with their block counts', () => {
    mockStages.data = [mainStage, rodeoStage];
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    expect(screen.getByText('Main Stage')).toBeInTheDocument();
    expect(screen.getByText('Rodeo Arena')).toBeInTheDocument();
    expect(screen.getByText('3 blocks')).toBeInTheDocument();
  });

  it('adds a stage by name', async () => {
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    await userEvent.type(screen.getByTestId('stage-manager-new-name'), 'Rodeo Arena');
    await userEvent.click(screen.getByTestId('stage-manager-add'));

    expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rodeo Arena' }),
    );
  });

  it('requires a name before adding', async () => {
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    await userEvent.click(screen.getByTestId('stage-manager-add'));

    expect(screen.getByTestId('stage-manager-error')).toHaveTextContent('Stage name is required.');
    expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  });

  it('disables delete when only one stage remains', () => {
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    expect(screen.getByTestId('stage-delete-stage-1')).toBeDisabled();
  });

  it('enables delete once a second stage exists', () => {
    mockStages.data = [mainStage, rodeoStage];
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    expect(screen.getByTestId('stage-delete-stage-2')).toBeEnabled();
  });

  it('requires confirmation before deleting a stage', async () => {
    mockStages.data = [mainStage, rodeoStage];
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    await userEvent.click(screen.getByTestId('stage-delete-stage-2'));

    expect(screen.getByTestId('stage-delete-confirm')).toBeInTheDocument();
    expect(mockDelete.mutateAsync).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('stage-delete-confirm-button'));

    expect(mockDelete.mutateAsync).toHaveBeenCalledWith('stage-2');
  });

  it('surfaces the server message when a stage delete is rejected', async () => {
    mockStages.data = [mainStage, rodeoStage];
    mockDelete.mutateAsync.mockRejectedValue(
      new Error('409: This stage still has 3 programming block(s).'),
    );
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage />, { wrapper: Wrapper });

    await userEvent.click(screen.getByTestId('stage-delete-stage-2'));
    await userEvent.click(screen.getByTestId('stage-delete-confirm-button'));

    expect(await screen.findByTestId('stage-manager-error')).toHaveTextContent(
      /programming block/,
    );
    expect(screen.getByTestId('stage-delete-confirm')).toBeInTheDocument();
  });

  it('hides management controls without permission', () => {
    mockStages.data = [mainStage, rodeoStage];
    render(<StageManagerPanel venueId="v1" eventId="e1" canManage={false} />, { wrapper: Wrapper });

    expect(screen.queryByTestId('stage-manager-add')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stage-delete-stage-2')).not.toBeInTheDocument();
    expect(screen.getByText('Rodeo Arena')).toBeInTheDocument();
  });
});
