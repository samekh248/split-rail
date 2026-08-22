import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCopy,
  faHourglassHalf,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import {
  useArtistAppearances,
  useCopyDealTerms,
  useFestivalArtists,
} from '@/api/festivals';
import {
  bookingStatusClass,
  bookingStatusLabel,
  normalizeBookingStatus,
} from '@/lib/festivalBookingStatus';
import type { ProgrammingBlockResponse } from '@/types/generated-api';
import { formatTimeRangeWithPreference } from '@/lib/timeDisplayFormat';

export interface ArtistAppearancesPanelProps {
  venueId: string;
  eventId: string;
  /** When set, shows appearances for this artist. Otherwise lists artists to pick from. */
  artistId?: string;
  /** Source block for copy-deal-terms (typically the block being edited). */
  sourceBlock?: ProgrammingBlockResponse | null;
  canManage: boolean;
}

function mapCopyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('409')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'Deal terms could not be copied to finalized blocks.';
  }
  return 'Something went wrong copying deal terms.';
}

export function ArtistAppearancesPanel({
  venueId,
  eventId,
  artistId,
  sourceBlock,
  canManage,
}: ArtistAppearancesPanelProps) {
  const [selectedArtistId, setSelectedArtistId] = useState(artistId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const artistsQuery = useFestivalArtists(venueId, eventId);
  const activeArtistId = artistId ?? selectedArtistId;
  const appearancesQuery = useArtistAppearances(venueId, eventId, activeArtistId || undefined);
  const copyDealTerms = useCopyDealTerms(venueId, eventId, activeArtistId ?? '');
  const appearances = appearancesQuery.data ?? [];
  const artists = artistsQuery.data ?? [];
  const activeArtist = artists.find((artist) => artist.id === activeArtistId);

  const handleCopyDealTerms = async () => {
    if (!sourceBlock?.id || !activeArtistId) {
      return;
    }

    const targets = appearances
      .map((a) => a.blockId)
      .filter((id): id is string => Boolean(id) && id !== sourceBlock.id);

    if (targets.length === 0) {
      setError('No other draft appearances to copy deal terms onto.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const count = await copyDealTerms.mutateAsync({
        sourceBlockId: sourceBlock.id,
        targetBlockIds: targets,
      });
      setSuccess(`Copied deal terms to ${count} appearance${count === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(mapCopyError(err));
    }
  };

  return (
    <section className="artist-appearances" data-testid="artist-appearances-panel">
      <h3 className="artist-appearances__title">
        <FontAwesomeIcon icon={faUserGroup} aria-hidden="true" /> Artist appearances
        {activeArtist ? (
          <span
            className={`festival-booking-status ${bookingStatusClass(activeArtist.bookingStatus)}`}
            data-testid="artist-booking-status"
          >
            <FontAwesomeIcon
              icon={
                normalizeBookingStatus(activeArtist.bookingStatus) === 'CONFIRMED'
                  ? faCircleCheck
                  : faHourglassHalf
              }
              aria-hidden="true"
            />
            {bookingStatusLabel(activeArtist.bookingStatus)}
          </span>
        ) : null}
      </h3>

      {!artistId ? (
        <div className="form-field">
          <label htmlFor="artist-picker" className="form-field__label">
            Select artist
          </label>
          <select
            id="artist-picker"
            className="form-field__input"
            value={selectedArtistId}
            onChange={(event) => {
              setSelectedArtistId(event.target.value);
              setError(null);
              setSuccess(null);
            }}
            data-testid="artist-picker"
          >
            <option value="">Choose an artist…</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id ?? ''}>
                {artist.name} ({artist.appearanceCount ?? 0}) —{' '}
                {bookingStatusLabel(artist.bookingStatus)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {activeArtistId && appearancesQuery.isLoading ? (
        <p className="artist-appearances__loading">Loading appearances…</p>
      ) : null}

      {error ? (
        <p className="artist-appearances__error" role="alert" data-testid="artist-appearances-error">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="artist-appearances__success" data-testid="artist-appearances-success">
          {success}
        </p>
      ) : null}

      {activeArtistId && !appearancesQuery.isLoading ? (
        <>
          <ul className="artist-appearances__list">
            {appearances.length === 0 ? (
              <li className="artist-appearances__empty">No linked appearances yet.</li>
            ) : (
              appearances.map((appearance) => (
                <li
                  key={appearance.blockId}
                  className="artist-appearances__item"
                  data-testid={`appearance-${appearance.blockId}`}
                >
                  <span className="artist-appearances__item-title">{appearance.title}</span>
                  <span className="artist-appearances__item-meta">
                    {appearance.dayDate} · {appearance.stageName} ·{' '}
                    {formatTimeRangeWithPreference(appearance.startTime, appearance.endTime)}
                  </span>
                  <span
                    className={`festival-booking-status ${bookingStatusClass(appearance.bookingStatus)}`}
                    data-testid={`appearance-booking-${appearance.blockId}`}
                  >
                    <FontAwesomeIcon
                      icon={
                        normalizeBookingStatus(appearance.bookingStatus) === 'CONFIRMED'
                          ? faCircleCheck
                          : faHourglassHalf
                      }
                      aria-hidden="true"
                    />
                    {bookingStatusLabel(appearance.bookingStatus)}
                  </span>
                  <span
                    className={`artist-appearances__status artist-appearances__status--${(appearance.settlementStatus ?? 'draft').toLowerCase()}`}
                  >
                    {appearance.settlementStatus}
                  </span>
                </li>
              ))
            )}
          </ul>

          {canManage && sourceBlock?.id && appearances.length > 1 ? (
            <button
              type="button"
              className="artist-appearances__copy btn-icon-label"
              data-testid="copy-deal-terms"
              onClick={() => void handleCopyDealTerms()}
              disabled={copyDealTerms.isPending}
            >
              <FontAwesomeIcon icon={faCopy} aria-hidden="true" />
              {copyDealTerms.isPending ? 'Copying…' : 'Copy deal terms to other appearances'}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
