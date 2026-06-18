import { describe, expect, it } from 'vitest';
import { canMoveArtist, getArtistReorderSwapPair } from '@/lib/reorderArtists';

const artists = [
  { id: 'a1', performanceOrder: 1 },
  { id: 'a2', performanceOrder: 2 },
  { id: 'a3', performanceOrder: 3 },
];

describe('reorderArtists', () => {
  it('swaps adjacent artists by performance order', () => {
    const swap = getArtistReorderSwapPair(artists, 'a2', 'up');
    expect(swap?.current.id).toBe('a2');
    expect(swap?.neighbor.id).toBe('a1');
  });

  it('returns null when moving the first artist up', () => {
    expect(getArtistReorderSwapPair(artists, 'a1', 'up')).toBeNull();
    expect(canMoveArtist(artists, 'a1', 'up')).toBe(false);
  });

  it('returns null when moving the last artist down', () => {
    expect(getArtistReorderSwapPair(artists, 'a3', 'down')).toBeNull();
    expect(canMoveArtist(artists, 'a3', 'down')).toBe(false);
  });
});
