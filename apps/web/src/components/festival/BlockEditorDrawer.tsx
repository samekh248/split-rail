import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faFloppyDisk,
  faHourglassHalf,
  faMusic,
  faPalette,
  faPlus,
  faStar,
  faStore,
} from '@fortawesome/free-solid-svg-icons';
import { FormField } from '@/components/auth/FormField';
import { SelectField } from '@/components/auth/SelectField';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { formatDateLabelFromIso } from '@/lib/dateDisplayFormat';
import {
  useCreateBlock,
  useFestivalArtists,
  useUpdateBlock,
} from '@/api/festivals';
import {
  bookingStatusClass,
  bookingStatusLabel,
  FESTIVAL_BOOKING_STATUSES,
  normalizeBookingStatus,
  type FestivalBookingStatus,
} from '@/lib/festivalBookingStatus';
import type {
  FestivalDayDto,
  ProgrammingBlockResponse,
  StageZoneResponse,
} from '@/types/generated-api';

export const BLOCK_CATEGORIES = ['MUSIC', 'EXHIBITION', 'VENDOR', 'EXPERIENCE'] as const;
export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

export interface BlockFormValues {
  title: string;
  dayDate: string;
  stageZoneId: string;
  startTime: string;
  endTime: string;
  category: BlockCategory;
  bookingStatus: FestivalBookingStatus;
  requiresSettlement: boolean;
  description: string;
  loadInTime: string;
  soundcheckTime: string;
  artistMode: 'none' | 'existing' | 'new';
  festivalArtistId: string;
  newArtistName: string;
}

export interface BlockFormErrors {
  title?: string;
  dayDate?: string;
  stageZoneId?: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  artist?: string;
}

export function isMusicCategory(category: string): boolean {
  return category === 'MUSIC';
}

export function defaultRequiresSettlement(category: BlockCategory): boolean {
  return category === 'MUSIC';
}

export function validateBlockForm(values: BlockFormValues): BlockFormErrors {
  const errors: BlockFormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'Title or act name is required.';
  }
  if (!values.dayDate) {
    errors.dayDate = 'Day is required.';
  }
  if (!values.stageZoneId) {
    errors.stageZoneId = 'Stage is required.';
  }
  if (!values.startTime) {
    errors.startTime = 'Start time is required.';
  }
  if (!values.endTime) {
    errors.endTime = 'End time is required.';
  }
  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errors.endTime = 'End time must be after the start time.';
  }
  if (!BLOCK_CATEGORIES.includes(values.category)) {
    errors.category = 'Category is required.';
  }
  if (values.artistMode === 'existing' && !values.festivalArtistId) {
    errors.artist = 'Select an artist or choose a different option.';
  }
  if (values.artistMode === 'new' && !values.newArtistName.trim()) {
    errors.artist = 'Enter a new artist name or choose a different option.';
  }

  return errors;
}

function mapBlockError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to edit programming blocks.';
  }
  if (message.includes('409')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'This placement conflicts with another block on the same stage.';
  }
  if (message.includes('400')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'Please check the block details and try again.';
  }
  return 'Something went wrong. Please try again.';
}

function categoryIcon(category: BlockCategory) {
  switch (category) {
    case 'MUSIC':
      return faMusic;
    case 'EXHIBITION':
      return faPalette;
    case 'VENDOR':
      return faStore;
    case 'EXPERIENCE':
      return faStar;
    default:
      return faStar;
  }
}

function categoryLabel(category: BlockCategory): string {
  switch (category) {
    case 'MUSIC':
      return 'Music';
    case 'EXHIBITION':
      return 'Exhibition';
    case 'VENDOR':
      return 'Vendor';
    case 'EXPERIENCE':
      return 'Experience';
    default:
      return category;
  }
}

function blockToFormValues(block: ProgrammingBlockResponse): BlockFormValues {
  const category = (block.category ?? 'MUSIC') as BlockCategory;
  return {
    title: block.title ?? '',
    dayDate: block.dayDate ?? '',
    stageZoneId: block.stageZoneId ?? '',
    startTime: block.startTime ?? '',
    endTime: block.endTime ?? '',
    category,
    bookingStatus: normalizeBookingStatus(block.bookingStatus),
    requiresSettlement: block.requiresSettlement ?? defaultRequiresSettlement(category),
    description: block.description ?? '',
    loadInTime: block.loadInTime ?? '',
    soundcheckTime: block.soundcheckTime ?? '',
    artistMode: block.festivalArtistId ? 'existing' : 'none',
    festivalArtistId: block.festivalArtistId ?? '',
    newArtistName: '',
  };
}

export interface BlockEditorDrawerProps {
  venueId: string;
  eventId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (block: ProgrammingBlockResponse) => void;
  days: FestivalDayDto[];
  stages: StageZoneResponse[];
  /** When set, the drawer edits an existing block. */
  block?: ProgrammingBlockResponse | null;
  initialDayDate?: string;
  initialStageZoneId?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  canPublish?: boolean;
  onPublishVisibilityChange?: (isPublic: boolean) => void | Promise<void>;
}

export function BlockEditorDrawer({
  venueId,
  eventId,
  open,
  onClose,
  onSaved,
  days,
  stages,
  block,
  initialDayDate = '',
  initialStageZoneId = '',
  initialStartTime = '',
  initialEndTime = '',
  canPublish = false,
  onPublishVisibilityChange,
}: BlockEditorDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const createBlock = useCreateBlock(venueId, eventId);
  const updateBlock = useUpdateBlock(venueId, eventId);
  const artistsQuery = useFestivalArtists(venueId, eventId, open);

  const isEdit = Boolean(block?.id);
  const isPending = createBlock.isPending || updateBlock.isPending;

  const [values, setValues] = useState<BlockFormValues>(() => ({
    title: '',
    dayDate: initialDayDate || days[0]?.dayDate || '',
    stageZoneId: initialStageZoneId || stages[0]?.id || '',
    startTime: initialStartTime || '20:00',
    endTime: initialEndTime || '21:00',
    category: 'MUSIC',
    bookingStatus: 'HOLD',
    requiresSettlement: true,
    description: '',
    loadInTime: '',
    soundcheckTime: '',
    artistMode: 'none',
    festivalArtistId: '',
    newArtistName: '',
  }));
  const [errors, setErrors] = useState<BlockFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (block) {
      setValues(blockToFormValues(block));
    } else {
      setValues({
        title: '',
        dayDate: initialDayDate || days[0]?.dayDate || '',
        stageZoneId: initialStageZoneId || stages[0]?.id || '',
        startTime: initialStartTime || '20:00',
        endTime: initialEndTime || '21:00',
        category: 'MUSIC',
        bookingStatus: 'HOLD',
        requiresSettlement: true,
        description: '',
        loadInTime: '',
        soundcheckTime: '',
        artistMode: 'none',
        festivalArtistId: '',
        newArtistName: '',
      });
    }

    setErrors({});
    setSubmitError(null);
    setWarnings([]);

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, block, days, stages, initialDayDate, initialStageZoneId, initialStartTime, initialEndTime, onClose]);

  if (!open) {
    return null;
  }

  const musicPreset = isMusicCategory(values.category);
  const showDealSection = musicPreset || values.requiresSettlement;

  const handleCategoryChange = (category: BlockCategory) => {
    setValues((prev) => ({
      ...prev,
      category,
      requiresSettlement: defaultRequiresSettlement(category),
    }));
  };

  const buildPayload = () => ({
    title: values.title.trim(),
    dayDate: values.dayDate,
    stageZoneId: values.stageZoneId,
    startTime: values.startTime,
    endTime: values.endTime,
    category: values.category,
    bookingStatus: values.bookingStatus,
    requiresSettlement: values.requiresSettlement,
    description: values.description.trim() || null,
    loadInTime: musicPreset && values.loadInTime ? values.loadInTime : null,
    soundcheckTime: musicPreset && values.soundcheckTime ? values.soundcheckTime : null,
    festivalArtistId: values.artistMode === 'existing' ? values.festivalArtistId : null,
    newArtistName: values.artistMode === 'new' ? values.newArtistName.trim() : null,
    isPubliclyVisible: block?.isPubliclyVisible ?? false,
  });

  const handleSubmit = async () => {
    const nextErrors = validateBlockForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitError(null);
    setWarnings([]);

    try {
      const payload = buildPayload();
      const saved = isEdit
        ? await updateBlock.mutateAsync({ blockId: block!.id!, ...payload })
        : await createBlock.mutateAsync(payload);

      const warningMessages = (saved.warnings ?? [])
        .map((w) => w.message)
        .filter((m): m is string => Boolean(m));
      setWarnings(warningMessages);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      setSubmitError(mapBlockError(error));
    }
  };

  const errorId = submitError ? 'block-editor-error' : undefined;
  const artists = artistsQuery.data ?? [];

  return (
    <div className="block-editor__backdrop" onClick={onClose} role="presentation">
      <aside
        ref={dialogRef}
        className="block-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-editor-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        data-testid="block-editor-drawer"
      >
        <ModalHeader
          title={isEdit ? 'Edit programming block' : 'Add programming block'}
          titleId="block-editor-title"
          onClose={onClose}
          closeDisabled={isPending}
        />

        {submitError ? (
          <p id={errorId} className="block-editor__error" role="alert">
            {submitError}
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <ul className="block-editor__warnings" data-testid="block-editor-warnings">
            {warnings.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        <fieldset className="block-editor__category" data-testid="block-category-picker">
          <legend className="block-editor__legend">Category</legend>
          <div className="block-editor__category-grid">
            {BLOCK_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`block-editor__category-btn block-category-badge block-category-badge--${category.toLowerCase()}${values.category === category ? ' block-editor__category-btn--active' : ''}`}
                aria-pressed={values.category === category}
                onClick={() => handleCategoryChange(category)}
                disabled={isPending}
              >
                <FontAwesomeIcon icon={categoryIcon(category)} aria-hidden="true" />
                {categoryLabel(category)}
              </button>
            ))}
          </div>
          {errors.category ? (
            <p className="block-editor__field-error" role="alert">
              {errors.category}
            </p>
          ) : null}
        </fieldset>

        <FormField
          id="block-title"
          label={musicPreset ? 'Act / title' : 'Title'}
          type="text"
          value={values.title}
          onChange={(title) => setValues((prev) => ({ ...prev, title }))}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              title: values.title.trim() ? undefined : 'Title or act name is required.',
            }))
          }
          error={errors.title}
          required
          disabled={isPending}
          describedBy={errorId}
        />

        {!musicPreset ? (
          <div className="form-field">
            <label htmlFor="block-description" className="form-field__label">
              Description
            </label>
            <textarea
              id="block-description"
              className="block-editor__textarea"
              value={values.description}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={4}
              disabled={isPending}
              data-testid="block-description"
            />
          </div>
        ) : null}

        <SelectField
          id="block-day"
          label="Day"
          value={values.dayDate}
          options={days.map((day) => ({
            value: day.dayDate ?? '',
            label: formatDateLabelFromIso(day.dayDate),
          }))}
          onChange={(dayDate) => setValues((prev) => ({ ...prev, dayDate }))}
          disabled={isPending}
          error={errors.dayDate}
          data-testid="block-day-select"
        />

        <SelectField
          id="block-stage"
          label="Stage"
          value={values.stageZoneId}
          options={stages.map((stage) => ({ value: stage.id ?? '', label: stage.name ?? '' }))}
          onChange={(stageZoneId) => setValues((prev) => ({ ...prev, stageZoneId }))}
          disabled={isPending}
          error={errors.stageZoneId}
          data-testid="block-stage-select"
        />

        <fieldset className="block-editor__booking" data-testid="block-booking-status-picker">
          <legend className="block-editor__legend">Booking status</legend>
          <div className="block-editor__booking-options">
            {FESTIVAL_BOOKING_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`block-editor__booking-btn festival-booking-status ${bookingStatusClass(status)}${values.bookingStatus === status ? ' block-editor__booking-btn--active' : ''}`}
                aria-pressed={values.bookingStatus === status}
                data-testid={`block-booking-status-${status.toLowerCase()}`}
                onClick={() => setValues((prev) => ({ ...prev, bookingStatus: status }))}
                disabled={isPending}
              >
                <FontAwesomeIcon
                  icon={status === 'CONFIRMED' ? faCircleCheck : faHourglassHalf}
                  aria-hidden="true"
                />
                {bookingStatusLabel(status)}
              </button>
            ))}
          </div>
          <p className="block-editor__booking-hint" data-testid="block-booking-status-hint">
            {values.bookingStatus === 'CONFIRMED'
              ? 'This appearance is confirmed.'
              : 'This appearance is a hold until it is confirmed.'}
          </p>
        </fieldset>

        <div className="block-editor__time-row">
          <FormField
            id="block-start-time"
            label="Start time"
            type="time"
            value={values.startTime}
            onChange={(startTime) => setValues((prev) => ({ ...prev, startTime }))}
            error={errors.startTime}
            required
            disabled={isPending}
          />
          <FormField
            id="block-end-time"
            label="End time"
            type="time"
            value={values.endTime}
            onChange={(endTime) => setValues((prev) => ({ ...prev, endTime }))}
            error={errors.endTime}
            required
            disabled={isPending}
          />
        </div>

        {musicPreset ? (
          <div className="block-editor__music-fields" data-testid="block-music-preset-fields">
            <FormField
              id="block-load-in"
              label="Load-in time"
              type="time"
              value={values.loadInTime}
              onChange={(loadInTime) => setValues((prev) => ({ ...prev, loadInTime }))}
              disabled={isPending}
            />
            <FormField
              id="block-soundcheck"
              label="Soundcheck time"
              type="time"
              value={values.soundcheckTime}
              onChange={(soundcheckTime) => setValues((prev) => ({ ...prev, soundcheckTime }))}
              disabled={isPending}
            />
            {values.description ? null : (
              <div className="form-field">
                <label htmlFor="block-description-music" className="form-field__label">
                  Notes (optional)
                </label>
                <textarea
                  id="block-description-music"
                  className="block-editor__textarea"
                  value={values.description}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={2}
                  disabled={isPending}
                />
              </div>
            )}
          </div>
        ) : null}

        <fieldset className="block-editor__artist" data-testid="block-artist-picker">
          <legend className="block-editor__legend">Artist (optional)</legend>
          <div className="block-editor__artist-modes">
            <label className="block-editor__radio">
              <input
                type="radio"
                name="artist-mode"
                checked={values.artistMode === 'none'}
                onChange={() =>
                  setValues((prev) => ({
                    ...prev,
                    artistMode: 'none',
                    festivalArtistId: '',
                    newArtistName: '',
                  }))
                }
                disabled={isPending}
              />
              No artist link
            </label>
            <label className="block-editor__radio">
              <input
                type="radio"
                name="artist-mode"
                checked={values.artistMode === 'existing'}
                onChange={() => setValues((prev) => ({ ...prev, artistMode: 'existing' }))}
                disabled={isPending}
              />
              Existing artist
            </label>
            <label className="block-editor__radio">
              <input
                type="radio"
                name="artist-mode"
                checked={values.artistMode === 'new'}
                onChange={() => setValues((prev) => ({ ...prev, artistMode: 'new' }))}
                disabled={isPending}
              />
              New artist name
            </label>
          </div>

          {values.artistMode === 'existing' ? (
            <SelectField
              id="block-artist"
              ariaLabel="Select artist"
              value={values.festivalArtistId}
              placeholder="Select an artist…"
              options={artists.map((artist) => ({
                value: artist.id ?? '',
                label: `${artist.name} (${artist.appearanceCount ?? 0} appearances) — ${bookingStatusLabel(artist.bookingStatus)}`,
              }))}
              onChange={(festivalArtistId) =>
                setValues((prev) => ({ ...prev, festivalArtistId }))
              }
              disabled={isPending}
              data-testid="block-artist-select"
            />
          ) : null}

          {values.artistMode === 'new' ? (
            <input
              className="form-field__input"
              type="text"
              value={values.newArtistName}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, newArtistName: event.target.value }))
              }
              placeholder="Artist name"
              disabled={isPending}
              aria-label="New artist name"
              data-testid="block-new-artist-input"
            />
          ) : null}

          {errors.artist ? (
            <p className="block-editor__field-error" role="alert">
              {errors.artist}
            </p>
          ) : null}
        </fieldset>

        <div className="block-editor__settlement" data-testid="block-settlement-section">
          {!musicPreset ? (
            <label className="block-editor__checkbox">
              <input
                type="checkbox"
                checked={values.requiresSettlement}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, requiresSettlement: event.target.checked }))
                }
                disabled={isPending}
                data-testid="block-requires-settlement"
              />
              Enable settlement for this block
            </label>
          ) : (
            <label className="block-editor__checkbox">
              <input
                type="checkbox"
                checked={values.requiresSettlement}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, requiresSettlement: event.target.checked }))
                }
                disabled={isPending}
                data-testid="block-requires-settlement"
              />
              Requires settlement
            </label>
          )}

          {showDealSection ? (
            <p className="block-editor__deal-hint" data-testid="block-deal-hint">
              Deal terms and payout math are entered during settlement — not at block creation.
            </p>
          ) : (
            <p className="block-editor__deal-hint block-editor__deal-hint--hidden" data-testid="block-deal-hidden">
              Deal math stays hidden until settlement is enabled for this block.
            </p>
          )}
        </div>

        {isEdit && canPublish ? (
          <label className="block-editor__checkbox" data-testid="block-publish-visibility">
            <input
              type="checkbox"
              checked={block?.isPubliclyVisible ?? false}
              onChange={(event) => void onPublishVisibilityChange?.(event.target.checked)}
              disabled={isPending}
            />
            Show on public itinerary
          </label>
        ) : null}

        <div className="block-editor__actions">
          <button
            type="button"
            className="team-modal__cancel"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="team-modal__save btn-icon-label"
            data-testid="block-editor-save"
            onClick={() => void handleSubmit()}
            disabled={isPending}
          >
            {isPending ? null : (
              <FontAwesomeIcon icon={isEdit ? faFloppyDisk : faPlus} aria-hidden="true" />
            )}
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add block'}
          </button>
        </div>
      </aside>
    </div>
  );
}
