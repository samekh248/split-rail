import { useEffect, useMemo, useRef, useState } from 'react';
import { previewNetPayout } from '@/lib/dealMathPreview';
import { formatMoney } from '@/lib/money';
import { canMoveArtist } from '@/lib/reorderArtists';
import type { MoveDirection } from '@/lib/reorderLineItems';
import type { DealType, EventArtistDto, EventStatus } from '@/types/generated-api';
import { FormulaEditor } from './FormulaEditor';

interface ArtistFormValues {
  artistName: string;
  dealType: DealType;
  customFormula: string;
  baseGuarantee: string;
  backendPercentage: string;
  taxWithholding: string;
}

interface ArtistDealPanelProps {
  artists: EventArtistDto[];
  eventStatus: EventStatus;
  canEditStructure?: boolean;
  grossRevenue?: string;
  totalDeductions?: string;
  onAddArtist?: (artist: {
    artistName: string;
    performanceOrder: number;
    dealType: DealType;
    customFormulaExpression?: string | null;
    baseGuarantee: string;
    backendPercentage: string;
    taxWithholdingPercentage: string;
  }) => void | Promise<void>;
  onUpdateArtist?: (
    id: string,
    artist: {
      artistName: string;
      performanceOrder: number;
      dealType: DealType;
      customFormulaExpression?: string | null;
      baseGuarantee: string;
      backendPercentage: string;
      taxWithholdingPercentage: string;
      rowVersion: string;
    },
  ) => void | Promise<void>;
  onReorderArtist?: (id: string, direction: MoveDirection) => void | Promise<void>;
  onRemoveArtist?: (id: string) => void | Promise<void>;
  formulaError?: string | null;
}

const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: 'guarantee', label: 'Guarantee' },
  { value: 'door_split', label: 'Door Split' },
  { value: 'custom', label: 'Custom Formula' },
];

const EMPTY_FORM: ArtistFormValues = {
  artistName: '',
  dealType: 'guarantee',
  customFormula: '',
  baseGuarantee: '0.00',
  backendPercentage: '70.00',
  taxWithholding: '0.00',
};

function valuesFromArtist(artist: EventArtistDto): ArtistFormValues {
  return {
    artistName: artist.artistName ?? '',
    dealType: (artist.dealType ?? 'guarantee') as DealType,
    customFormula: artist.customFormulaExpression ?? '',
    baseGuarantee: artist.baseGuarantee ?? '0.00',
    backendPercentage: artist.backendPercentage ?? '0.00',
    taxWithholding: artist.taxWithholdingPercentage ?? '0.00',
  };
}

function valuesEqual(a: ArtistFormValues, b: ArtistFormValues): boolean {
  return (
    a.artistName === b.artistName &&
    a.dealType === b.dealType &&
    a.customFormula === b.customFormula &&
    a.baseGuarantee === b.baseGuarantee &&
    a.backendPercentage === b.backendPercentage &&
    a.taxWithholding === b.taxWithholding
  );
}

export function ArtistDealPanel({
  artists,
  eventStatus,
  canEditStructure = false,
  grossRevenue = '0.00',
  totalDeductions = '0.00',
  onAddArtist,
  onUpdateArtist,
  onReorderArtist,
  onRemoveArtist,
  formulaError,
}: ArtistDealPanelProps) {
  const editable = eventStatus === 'PRE_SHOW' && canEditStructure;
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [editingPerformanceOrder, setEditingPerformanceOrder] = useState(1);
  const [editingRowVersion, setEditingRowVersion] = useState('');
  const [savedSnapshot, setSavedSnapshot] = useState<ArtistFormValues>(EMPTY_FORM);
  const [artistName, setArtistName] = useState('');
  const [dealType, setDealType] = useState<DealType>('guarantee');
  const [customFormula, setCustomFormula] = useState('');
  const [baseGuarantee, setBaseGuarantee] = useState('0.00');
  const [backendPercentage, setBackendPercentage] = useState('70.00');
  const [taxWithholding, setTaxWithholding] = useState('0.00');
  const confirmDiscardRef = useRef(false);

  const currentValues: ArtistFormValues = {
    artistName,
    dealType,
    customFormula,
    baseGuarantee,
    backendPercentage,
    taxWithholding,
  };

  const isDirty = !valuesEqual(currentValues, savedSnapshot);

  const preview = useMemo(
    () =>
      previewNetPayout({
        dealType,
        baseGuarantee,
        backendPercentage,
        taxWithholdingPercentage: taxWithholding,
        customFormulaExpression: dealType === 'custom' ? customFormula : null,
        grossRevenue,
        totalDeductions,
      }),
    [
      dealType,
      baseGuarantee,
      backendPercentage,
      taxWithholding,
      customFormula,
      grossRevenue,
      totalDeductions,
    ],
  );

  useEffect(() => {
    confirmDiscardRef.current = false;
  }, [editingArtistId, formMode]);

  const resetToAddMode = () => {
    setFormMode('add');
    setEditingArtistId(null);
    setEditingPerformanceOrder(artists.length + 1);
    setEditingRowVersion('');
    setSavedSnapshot(EMPTY_FORM);
    setArtistName('');
    setDealType('guarantee');
    setCustomFormula('');
    setBaseGuarantee('0.00');
    setBackendPercentage('70.00');
    setTaxWithholding('0.00');
  };

  const confirmDiscardIfDirty = (): boolean => {
    if (!isDirty || confirmDiscardRef.current) {
      return true;
    }

    const confirmed = window.confirm(
      'You have unsaved changes. Discard them and continue?',
    );
    if (confirmed) {
      confirmDiscardRef.current = true;
    }
    return confirmed;
  };

  const loadArtistForEdit = (artist: EventArtistDto) => {
    if (!artist.id) return;
    const values = valuesFromArtist(artist);
    setFormMode('edit');
    setEditingArtistId(artist.id);
    setEditingPerformanceOrder(artist.performanceOrder ?? 1);
    setEditingRowVersion(artist.rowVersion ?? '');
    setSavedSnapshot(values);
    setArtistName(values.artistName);
    setDealType(values.dealType);
    setCustomFormula(values.customFormula);
    setBaseGuarantee(values.baseGuarantee);
    setBackendPercentage(values.backendPercentage);
    setTaxWithholding(values.taxWithholding);
  };

  const handleEditClick = (artist: EventArtistDto) => {
    if (!confirmDiscardIfDirty()) return;
    loadArtistForEdit(artist);
  };

  const handleCancel = () => {
    if (!confirmDiscardIfDirty()) return;
    resetToAddMode();
  };

  const handleSubmit = async () => {
    if (!artistName.trim()) return;

    const payload = {
      artistName: artistName.trim(),
      performanceOrder:
        formMode === 'edit' ? editingPerformanceOrder : artists.length + 1,
      dealType,
      customFormulaExpression: dealType === 'custom' ? customFormula : null,
      baseGuarantee,
      backendPercentage,
      taxWithholdingPercentage: taxWithholding,
    };

    if (formMode === 'edit' && editingArtistId && onUpdateArtist) {
      await onUpdateArtist(editingArtistId, {
        ...payload,
        rowVersion: editingRowVersion,
      });
      resetToAddMode();
      return;
    }

    if (onAddArtist) {
      await onAddArtist(payload);
      resetToAddMode();
    }
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
            {editable && (
              <span className="artist-deal-panel__actions">
                {onUpdateArtist && artist.id && (
                  <button
                    type="button"
                    className="artist-deal-panel__edit"
                    data-testid={`edit-artist-${artist.id}`}
                    onClick={() => handleEditClick(artist)}
                  >
                    Edit
                  </button>
                )}
                {onReorderArtist && artist.id && (
                  <>
                    <button
                      type="button"
                      data-testid={`move-artist-up-${artist.id}`}
                      disabled={!canMoveArtist(artists, artist.id, 'up')}
                      onClick={() => onReorderArtist(artist.id!, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      data-testid={`move-artist-down-${artist.id}`}
                      disabled={!canMoveArtist(artists, artist.id, 'down')}
                      onClick={() => onReorderArtist(artist.id!, 'down')}
                    >
                      ↓
                    </button>
                  </>
                )}
                {onRemoveArtist && (
                  <button
                    type="button"
                    className="artist-deal-panel__remove"
                    data-testid={`remove-artist-${artist.id}`}
                    onClick={() => artist.id && onRemoveArtist(artist.id)}
                  >
                    Remove
                  </button>
                )}
              </span>
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

          <div className="artist-deal-panel__preview" data-testid="payout-preview">
            {'error' in preview ? (
              <p role="alert" data-testid="payout-preview-error">
                {preview.error}
              </p>
            ) : (
              <span>Preview payout: {formatMoney(preview.payout)}</span>
            )}
          </div>

          <div className="artist-deal-panel__form-actions">
            {formMode === 'edit' ? (
              <button
                type="button"
                data-testid="save-artist-btn"
                disabled={!artistName.trim()}
                onClick={() => void handleSubmit()}
              >
                Save Changes
              </button>
            ) : (
              <button
                type="button"
                data-testid="add-artist-btn"
                disabled={!artistName.trim()}
                onClick={() => void handleSubmit()}
              >
                Add Artist
              </button>
            )}
            {formMode === 'edit' && (
              <button
                type="button"
                data-testid="cancel-artist-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
