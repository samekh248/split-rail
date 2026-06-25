import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pickSelectFieldOption } from '../utils/selectField';
import { ArtistDealPanel } from '@/components/artists/ArtistDealPanel';
import type { EventArtistDto } from '@/types/generated-api';

const artists: EventArtistDto[] = [
  {
    id: 'artist-1',
    artistName: 'The Headliner',
    performanceOrder: 1,
    dealType: 'guarantee',
    customFormulaExpression: null,
    baseGuarantee: '5000.00',
    backendPercentage: '70.00',
    taxWithholdingPercentage: '0.00',
    calculatedNetPayout: '5000.00',
    rowVersion: 'v1',
  },
  {
    id: 'artist-2',
    artistName: 'Support Act',
    performanceOrder: 2,
    dealType: 'door_split',
    customFormulaExpression: null,
    baseGuarantee: '0.00',
    backendPercentage: '50.00',
    taxWithholdingPercentage: '0.00',
    calculatedNetPayout: '2500.00',
    rowVersion: 'v2',
  },
];

describe('ArtistDealPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders existing artists and payout values', () => {
    render(<ArtistDealPanel artists={artists} eventStatus="PRE_SHOW" />);

    expect(screen.getByTestId('artist-row-artist-1')).toHaveTextContent('The Headliner');
    expect(screen.getByTestId('payout-artist-1')).toHaveTextContent('$5,000.00');
  });

  it('adds a guarantee artist from the form', async () => {
    const user = userEvent.setup();
    const onAddArtist = vi.fn();

    render(
      <ArtistDealPanel
        artists={[]}
        eventStatus="PRE_SHOW"
        canEditStructure
        grossRevenue="10000.00"
        totalDeductions="0.00"
        onAddArtist={onAddArtist}
      />,
    );

    await user.type(screen.getByTestId('artist-name-input'), 'Opener');
    await user.click(screen.getByTestId('add-artist-btn'));

    expect(onAddArtist).toHaveBeenCalledWith(
      expect.objectContaining({
        artistName: 'Opener',
        dealType: 'guarantee',
        performanceOrder: 1,
      }),
    );
  });

  it('populates the form when Edit is clicked and saves via onUpdateArtist', async () => {
    const user = userEvent.setup();
    const onUpdateArtist = vi.fn();

    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        canEditStructure
        grossRevenue="10000.00"
        totalDeductions="0.00"
        onUpdateArtist={onUpdateArtist}
      />,
    );

    await user.click(screen.getByTestId('edit-artist-artist-1'));
    expect(screen.getByTestId('artist-name-input')).toHaveValue('The Headliner');
    expect(screen.getByTestId('save-artist-btn')).toBeInTheDocument();

    await user.clear(screen.getByTestId('base-guarantee-input'));
    await user.type(screen.getByTestId('base-guarantee-input'), '6000.00');
    await user.click(screen.getByTestId('save-artist-btn'));

    expect(onUpdateArtist).toHaveBeenCalledWith(
      'artist-1',
      expect.objectContaining({
        artistName: 'The Headliner',
        baseGuarantee: '6000.00',
        rowVersion: 'v1',
        performanceOrder: 1,
      }),
    );
  });

  it('clears the form when Cancel is clicked in edit mode', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        canEditStructure
        onUpdateArtist={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('edit-artist-artist-1'));
    await user.clear(screen.getByTestId('artist-name-input'));
    await user.type(screen.getByTestId('artist-name-input'), 'Changed');
    await user.click(screen.getByTestId('cancel-artist-btn'));

    expect(screen.getByTestId('add-artist-btn')).toBeInTheDocument();
    expect(screen.getByTestId('artist-name-input')).toHaveValue('');
  });

  it('confirms before switching edit target with unsaved changes', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        canEditStructure
        onUpdateArtist={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('edit-artist-artist-1'));
    await user.clear(screen.getByTestId('artist-name-input'));
    await user.type(screen.getByTestId('artist-name-input'), 'Changed');
    await user.click(screen.getByTestId('edit-artist-artist-2'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId('artist-name-input')).toHaveValue('Changed');
  });

  it('calls onReorderArtist when move down is clicked', async () => {
    const user = userEvent.setup();
    const onReorderArtist = vi.fn();

    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        canEditStructure
        onReorderArtist={onReorderArtist}
      />,
    );

    await user.click(screen.getByTestId('move-artist-down-artist-1'));
    expect(onReorderArtist).toHaveBeenCalledWith('artist-1', 'down');
  });

  it('updates payout preview when backend percent changes', async () => {
    const user = userEvent.setup();

    render(
      <ArtistDealPanel
        artists={[]}
        eventStatus="PRE_SHOW"
        canEditStructure
        grossRevenue="10000.00"
        totalDeductions="0.00"
        onAddArtist={vi.fn()}
      />,
    );

    expect(screen.getByTestId('payout-preview')).toHaveTextContent('$7,000.00');

    await user.clear(screen.getByTestId('backend-percent-input'));
    await user.type(screen.getByTestId('backend-percent-input'), '50.00');

    expect(screen.getByTestId('payout-preview')).toHaveTextContent('$5,000.00');
  });

  it('shows preview error for invalid custom formula', async () => {
    const user = userEvent.setup();

    render(
      <ArtistDealPanel
        artists={[]}
        eventStatus="PRE_SHOW"
        canEditStructure
        grossRevenue="10000.00"
        totalDeductions="0.00"
        onAddArtist={vi.fn()}
      />,
    );

    await pickSelectFieldOption(user, 'deal-type-select', 'custom');
    await user.type(screen.getByTestId('formula-textarea'), 'GrossRevenue + +');

    expect(screen.getByTestId('payout-preview-error')).toBeInTheDocument();
    expect(screen.queryByText(/Preview payout:/)).not.toBeInTheDocument();
  });

  it('shows formula editor for custom deals and surfaces formula errors', async () => {
    const user = userEvent.setup();

    render(
      <ArtistDealPanel
        artists={[]}
        eventStatus="PRE_SHOW"
        canEditStructure
        formulaError="Formula could not be evaluated. Check tokens and syntax."
      />,
    );

    await pickSelectFieldOption(user, 'deal-type-select', 'custom');

    expect(screen.getByTestId('formula-editor')).toBeInTheDocument();
    expect(screen.getByTestId('formula-error')).toHaveTextContent('Formula could not be evaluated');
  });

  it('removes an artist when editable', async () => {
    const user = userEvent.setup();
    const onRemoveArtist = vi.fn();

    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        canEditStructure
        onRemoveArtist={onRemoveArtist}
      />,
    );

    await user.click(screen.getByTestId('remove-artist-artist-1'));
    expect(onRemoveArtist).toHaveBeenCalledWith('artist-1');
  });

  it('hides add/remove controls when not editable', () => {
    render(<ArtistDealPanel artists={artists} eventStatus="SETTLED" />);

    expect(screen.queryByTestId('artist-add-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-artist-artist-1')).not.toBeInTheDocument();
  });

  it('hides controls when user lacks edit permission during Pre-Show', () => {
    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        canEditStructure={false}
      />,
    );

    expect(screen.queryByTestId('artist-add-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-artist-artist-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('payout-artist-1')).toBeInTheDocument();
  });
});
