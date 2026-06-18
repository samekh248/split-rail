import type { MoveDirection } from '@/lib/reorderLineItems';

export interface OrderableArtist {
  id?: string;
  performanceOrder?: number | null;
}

export function getArtistReorderSwapPair<T extends OrderableArtist>(
  artists: T[],
  artistId: string,
  direction: MoveDirection,
): { current: T; neighbor: T } | null {
  const sorted = [...artists].sort(
    (a, b) => (a.performanceOrder ?? 0) - (b.performanceOrder ?? 0),
  );
  const index = sorted.findIndex((artist) => artist.id === artistId);
  if (index === -1) return null;

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= sorted.length) return null;

  return { current: sorted[index], neighbor: sorted[neighborIndex] };
}

export function canMoveArtist<T extends OrderableArtist>(
  artists: T[],
  artistId: string,
  direction: MoveDirection,
): boolean {
  return getArtistReorderSwapPair(artists, artistId, direction) !== null;
}
