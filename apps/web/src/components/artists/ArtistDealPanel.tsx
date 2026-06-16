import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { DealType, EventArtistDto, EventStatus } from '@/types/generated-api';
import { FormulaEditor } from './FormulaEditor';

interface ArtistDealPanelProps {
  artists: EventArtistDto[];
  eventStatus: EventStatus;
  onAddArtist?: (artist: {
    artistName: string;
    performanceOrder: number;
    dealType: DealType;
    customFormulaExpression?: string | null;
    baseGuarantee: string;
    backendPercentage: string;
    taxWithholdingPercentage: string;
  }) => void;
  onRemoveArtist?: (id: string) => void;
  formulaError?: string | null;
}

const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: 'guarantee', label: 'Guarantee' },
  { value: 'door_split', label: 'Door Split' },
  { value: 'custom', label: 'Custom Formula' },
];

export function ArtistDealPanel({
  artists,
  eventStatus,
  onAddArtist,
  onRemoveArtist,
  formulaError,
}: ArtistDealPanelProps) {
  const editable = eventStatus === 'PRE_SHOW';
  const [artistName, setArtistName] = useState('');
  const [dealType, setDealType] = useState<DealType>('guarantee');
  const [customFormula, setCustomFormula] = useState('');
  const [baseGuarantee, setBaseGuarantee] = useState('0.00');
  const [backendPercentage, setBackendPercentage] = useState('70.00');
  const [taxWithholding, setTaxWithholding] = useState('0.00');

  const handleAdd = () => {
    if (!artistName.trim() || !onAddArtist) return;
    onAddArtist({
      artistName: artistName.trim(),
      performanceOrder: artists.length + 1,
      dealType,
      customFormulaExpression: dealType === 'custom' ? customFormula : null,
      baseGuarantee,
      backendPercentage,
      taxWithholdingPercentage: taxWithholding,
    });
    setArtistName('');
    setCustomFormula('');
  };

  return (
    <section className="artist-deal-panel" data-testid="artist-deal-panel">
      <h3>Artist Deals</h3>

      <ul className="artist-deal-panel__list">
        {artists.map((artist) => (
          <li key={artist.id} data-testid={`artist-row-${artist.id}`}>
            <strong>{artist.artistName}</strong> — {artist.dealType?.replace('_', ' ') ?? 'unknown'}
            {' · Payout: '}
            <span data-testid={`payout-${artist.id}`}>
              {formatMoney(artist.calculatedNetPayout)}
            </span>
            {editable && onRemoveArtist && (
              <button
                type="button"
                className="artist-deal-panel__remove"
                data-testid={`remove-artist-${artist.id}`}
                onClick={() => artist.id && onRemoveArtist(artist.id)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <div className="artist-deal-panel__form" data-testid="artist-add-form">
          <label>
            Artist name
            <input
              type="text"
              value={artistName}
              data-testid="artist-name-input"
              onChange={(e) => setArtistName(e.target.value)}
            />
          </label>

          <label>
            Deal type
            <select
              value={dealType}
              data-testid="deal-type-select"
              onChange={(e) => setDealType(e.target.value as DealType)}
            >
              {DEAL_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Base guarantee
            <input
              type="text"
              value={baseGuarantee}
              data-testid="base-guarantee-input"
              onChange={(e) => setBaseGuarantee(e.target.value)}
            />
          </label>

          <label>
            Backend %
            <input
              type="text"
              value={backendPercentage}
              data-testid="backend-percent-input"
              onChange={(e) => setBackendPercentage(e.target.value)}
            />
          </label>

          <label>
            Tax withholding %
            <input
              type="text"
              value={taxWithholding}
              data-testid="tax-percent-input"
              onChange={(e) => setTaxWithholding(e.target.value)}
            />
          </label>

          {dealType === 'custom' && (
            <FormulaEditor
              expression={customFormula}
              onChange={setCustomFormula}
              error={formulaError}
            />
          )}

          <button
            type="button"
            data-testid="add-artist-btn"
            disabled={!artistName.trim()}
            onClick={handleAdd}
          >
            Add Artist
          </button>
        </div>
      )}
    </section>
  );
}
