import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BlockEditorDrawer,
  validateBlockForm,
  type BlockFormValues,
} from '@/components/festival/BlockEditorDrawer';
import { setDateDisplayFormat } from '@/lib/dateDisplayFormat';

const mockCreateBlock = { mutateAsync: vi.fn(), isPending: false };
const mockUpdateBlock = { mutateAsync: vi.fn(), isPending: false };
const mockArtists = { data: [{ id: 'artist-1', name: 'Cody Jinks', appearanceCount: 2 }] };

vi.mock('@/api/festivals', () => ({
  useCreateBlock: () => mockCreateBlock,
  useUpdateBlock: () => mockUpdateBlock,
  useFestivalArtists: () => mockArtists,
}));

const days = [{ dayDate: '2026-08-14' }, { dayDate: '2026-08-15' }];
const stages = [{ id: 'stage-1', name: 'Main Stage', sortOrder: 0, blockCount: 0 }];

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderDrawer(overrides: Partial<Parameters<typeof BlockEditorDrawer>[0]> = {}) {
  return render(
    <BlockEditorDrawer
      venueId="venue-1"
      eventId="event-1"
      open
      onClose={vi.fn()}
      days={days}
      stages={stages}
      {...overrides}
    />,
    { wrapper: Wrapper },
  );
}

describe('validateBlockForm', () => {
  const base: BlockFormValues = {
    title: 'Opening Act',
    dayDate: '2026-08-14',
    stageZoneId: 'stage-1',
    startTime: '20:00',
    endTime: '21:00',
    category: 'MUSIC',
    bookingStatus: 'HOLD',
    requiresSettlement: true,
    description: '',
    loadInTime: '',
    soundcheckTime: '',
    artistMode: 'none',
    festivalArtistId: '',
    newArtistName: '',
  };

  it('requires title, day, stage, times, and category', () => {
    expect(validateBlockForm(base)).toEqual({});
    expect(validateBlockForm({ ...base, title: '  ' }).title).toMatch(/required/i);
    expect(validateBlockForm({ ...base, dayDate: '' }).dayDate).toMatch(/required/i);
    expect(validateBlockForm({ ...base, stageZoneId: '' }).stageZoneId).toMatch(/required/i);
  });

  it('rejects end time before start time', () => {
    expect(validateBlockForm({ ...base, startTime: '22:00', endTime: '20:00' }).endTime).toMatch(
      /after the start time/,
    );
  });

  it('requires artist selection when linking an existing artist', () => {
    expect(
      validateBlockForm({ ...base, artistMode: 'existing', festivalArtistId: '' }).artist,
    ).toMatch(/Select an artist/);
  });

  it('requires a name when creating a new artist', () => {
    expect(
      validateBlockForm({ ...base, artistMode: 'new', newArtistName: '  ' }).artist,
    ).toMatch(/Enter a new artist name/);
  });
});

describe('BlockEditorDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBlock.mutateAsync.mockResolvedValue({
      id: 'block-1',
      title: 'Cody Jinks',
      category: 'MUSIC',
      warnings: [],
    });
  });

  afterEach(() => {
    setDateDisplayFormat(undefined);
  });

  it('formats day options using the signed-in user\'s date display preference', () => {
    setDateDisplayFormat('MMM d, yyyy');
    renderDrawer();

    expect(screen.getByTestId('block-day-select')).toHaveTextContent('Aug 14, 2026');
  });

  it('reformats day options when the date display preference changes', () => {
    setDateDisplayFormat('dd/MM/yyyy');
    const { unmount } = renderDrawer();
    expect(screen.getByTestId('block-day-select')).toHaveTextContent('14/08/2026');
    unmount();

    setDateDisplayFormat('yyyy-MM-dd');
    renderDrawer();
    expect(screen.getByTestId('block-day-select')).toHaveTextContent('2026-08-14');
  });

  it('places Cancel on the left and the save action on the right', () => {
    renderDrawer();

    const buttons = screen.getAllByRole('button', { name: /Cancel|Add block/i });
    expect(buttons[0]).toHaveTextContent('Cancel');
    expect(buttons[0]).toHaveClass('team-modal__cancel');
    expect(buttons[1]).toHaveTextContent('Add block');
    expect(buttons[1]).toHaveClass('team-modal__save');
  });

  it('shows music preset fields for MUSIC category', () => {
    renderDrawer();

    expect(screen.getByTestId('block-music-preset-fields')).toBeInTheDocument();
    expect(screen.getByLabelText(/Load-in time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Soundcheck time/)).toBeInTheDocument();
    expect(screen.getByTestId('block-deal-hint')).toHaveTextContent(/during settlement/);
  });

  it('shows description-first layout for non-music categories with deal math hidden by default', async () => {
    renderDrawer();

    await userEvent.click(screen.getByRole('button', { name: /Exhibition/i }));

    expect(screen.queryByTestId('block-music-preset-fields')).not.toBeInTheDocument();
    expect(screen.getByTestId('block-description')).toBeInTheDocument();
    expect(screen.getByTestId('block-requires-settlement')).not.toBeChecked();
    expect(screen.getByTestId('block-deal-hidden')).toHaveTextContent(/hidden until settlement is enabled/);
  });

  it('reveals deal hint when settlement is enabled on a non-music block', async () => {
    renderDrawer();

    await userEvent.click(screen.getByRole('button', { name: /Vendor/i }));
    await userEvent.click(screen.getByTestId('block-requires-settlement'));

    expect(screen.getByTestId('block-deal-hint')).toHaveTextContent(/during settlement/);
    expect(screen.queryByTestId('block-deal-hidden')).not.toBeInTheDocument();
  });

  it('blocks save with validation messaging when required fields are missing', async () => {
    renderDrawer();

    await userEvent.clear(screen.getByLabelText(/Act \/ title/));
    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(screen.getByText('Title or act name is required.')).toBeInTheDocument();
    expect(mockCreateBlock.mutateAsync).not.toHaveBeenCalled();
  });

  it('supports picking an existing artist', async () => {
    renderDrawer();

    await userEvent.click(screen.getByLabelText('Existing artist'));
    await userEvent.click(screen.getByTestId('block-artist-select'));
    await userEvent.click(screen.getByTestId('block-artist-select-option-artist-1'));
    await userEvent.type(screen.getByLabelText(/Act \/ title/), 'Cody Jinks');
    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(mockCreateBlock.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cody Jinks',
        festivalArtistId: 'artist-1',
        newArtistName: null,
      }),
    );
  });

  it('supports entering a new artist name', async () => {
    renderDrawer();

    await userEvent.click(screen.getByLabelText('New artist name'));
    await userEvent.type(screen.getByTestId('block-new-artist-input'), 'New Band');
    await userEvent.type(screen.getByLabelText(/Act \/ title/), 'Headliner');
    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(mockCreateBlock.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        newArtistName: 'New Band',
        festivalArtistId: null,
      }),
    );
  });

  it('shows category badges with distinct labels', () => {
    renderDrawer();

    const picker = screen.getByTestId('block-category-picker');
    expect(within(picker).getByRole('button', { name: /Music/i })).toHaveClass(
      'block-category-badge--music',
    );
    expect(within(picker).getByRole('button', { name: /Exhibition/i })).toHaveClass(
      'block-category-badge--exhibition',
    );
  });

  it('moves the selected-category indicator to the clicked category', async () => {
    renderDrawer();

    const picker = screen.getByTestId('block-category-picker');
    const musicBtn = within(picker).getByRole('button', { name: /Music/i });
    const exhibitionBtn = within(picker).getByRole('button', { name: /Exhibition/i });

    expect(musicBtn).toHaveAttribute('aria-pressed', 'true');
    expect(musicBtn).toHaveClass('block-editor__category-btn--active');
    expect(exhibitionBtn).toHaveAttribute('aria-pressed', 'false');
    expect(exhibitionBtn).not.toHaveClass('block-editor__category-btn--active');

    await userEvent.click(exhibitionBtn);

    expect(exhibitionBtn).toHaveAttribute('aria-pressed', 'true');
    expect(exhibitionBtn).toHaveClass('block-editor__category-btn--active');
    expect(musicBtn).toHaveAttribute('aria-pressed', 'false');
    expect(musicBtn).not.toHaveClass('block-editor__category-btn--active');
  });

  it('defaults a new block to a hold and submits it that way', async () => {
    renderDrawer();

    expect(screen.getByTestId('block-booking-status-hold')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('block-booking-status-hint')).toHaveTextContent(/hold until/i);

    await userEvent.type(screen.getByLabelText(/Act \/ title/), 'Cody Jinks');
    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(mockCreateBlock.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ bookingStatus: 'HOLD' }),
    );
  });

  it('promotes a new block to confirmed before saving', async () => {
    renderDrawer();

    await userEvent.type(screen.getByLabelText(/Act \/ title/), 'Cody Jinks');
    await userEvent.click(screen.getByTestId('block-booking-status-confirmed'));

    expect(screen.getByTestId('block-booking-status-confirmed')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(mockCreateBlock.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ bookingStatus: 'CONFIRMED' }),
    );
  });

  it('preselects the saved booking status when editing and can demote back to a hold', async () => {
    const existingBlock = {
      id: 'block-edit-2',
      title: 'Confirmed Act',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      startTime: '20:00',
      endTime: '21:00',
      category: 'MUSIC',
      requiresSettlement: true,
      bookingStatus: 'CONFIRMED',
      warnings: [],
    };

    mockUpdateBlock.mutateAsync.mockResolvedValue(existingBlock);

    renderDrawer({ block: existingBlock });

    expect(screen.getByTestId('block-booking-status-confirmed')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByTestId('block-booking-status-hold'));
    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(mockUpdateBlock.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ blockId: 'block-edit-2', bookingStatus: 'HOLD' }),
    );
  });

  it('supports full day, stage, and time reassignment through form fields without dragging', async () => {
    const existingBlock = {
      id: 'block-edit-1',
      title: 'Opening Act',
      dayDate: '2026-08-14',
      stageZoneId: 'stage-1',
      startTime: '14:00',
      endTime: '15:00',
      category: 'MUSIC',
      requiresSettlement: true,
      warnings: [],
    };

    mockUpdateBlock.mutateAsync.mockResolvedValue({
      ...existingBlock,
      dayDate: '2026-08-15',
      stageZoneId: 'stage-1',
      startTime: '18:00',
      endTime: '19:00',
    });

    renderDrawer({
      block: existingBlock,
      days: [
        { dayDate: '2026-08-14' },
        { dayDate: '2026-08-15' },
      ],
      stages: [
        { id: 'stage-1', name: 'Main Stage', sortOrder: 0, blockCount: 0 },
        { id: 'stage-2', name: 'Side Stage', sortOrder: 1, blockCount: 0 },
      ],
    });

    await userEvent.click(screen.getByTestId('block-day-select'));
    await userEvent.click(screen.getByTestId('block-day-select-option-2026-08-15'));
    await userEvent.click(screen.getByTestId('block-stage-select'));
    await userEvent.click(screen.getByTestId('block-stage-select-option-stage-2'));
    await userEvent.clear(screen.getByLabelText('Start time'));
    await userEvent.type(screen.getByLabelText('Start time'), '18:00');
    await userEvent.clear(screen.getByLabelText('End time'));
    await userEvent.type(screen.getByLabelText('End time'), '19:00');
    await userEvent.click(screen.getByTestId('block-editor-save'));

    expect(mockUpdateBlock.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: 'block-edit-1',
        dayDate: '2026-08-15',
        stageZoneId: 'stage-2',
        startTime: '18:00',
        endTime: '19:00',
      }),
    );
  });
});
