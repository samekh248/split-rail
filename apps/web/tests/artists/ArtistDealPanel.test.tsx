import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
];

describe('ArtistDealPanel', () => {
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

  it('shows formula editor for custom deals and surfaces formula errors', async () => {
    const user = userEvent.setup();

    render(
      <ArtistDealPanel
        artists={[]}
        eventStatus="PRE_SHOW"
        formulaError="Formula could not be evaluated. Check tokens and syntax."
      />,
    );

    await user.selectOptions(screen.getByTestId('deal-type-select'), 'custom');

    expect(screen.getByTestId('formula-editor')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Formula could not be evaluated');
  });

  it('removes an artist when editable', async () => {
    const user = userEvent.setup();
    const onRemoveArtist = vi.fn();

    render(
      <ArtistDealPanel
        artists={artists}
        eventStatus="PRE_SHOW"
        onRemoveArtist={onRemoveArtist}
      />,
    );

    await user.click(screen.getByTestId('remove-artist-artist-1'));
    expect(onRemoveArtist).toHaveBeenCalledWith('artist-1');
  });

  it('hides add/remove controls after settlement', () => {
    render(<ArtistDealPanel artists={artists} eventStatus="SETTLED" />);

    expect(screen.queryByTestId('artist-add-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-artist-artist-1')).not.toBeInTheDocument();
  });
});
