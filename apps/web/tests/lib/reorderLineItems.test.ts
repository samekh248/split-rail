import { describe, expect, it } from 'vitest';
import { canMoveRow, getReorderSwapPair, nextSortOrder } from '@/lib/reorderLineItems';

describe('reorderLineItems', () => {
  const rows = [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
  ];

  it('computes next sort order', () => {
    expect(nextSortOrder(rows)).toBe(3);
    expect(nextSortOrder([])).toBe(0);
  });

  it('returns neighbor pair for move down', () => {
    const pair = getReorderSwapPair(rows, 'a', 'down');
    expect(pair?.current.id).toBe('a');
    expect(pair?.neighbor.id).toBe('b');
  });

  it('returns null at block boundaries', () => {
    expect(getReorderSwapPair(rows, 'a', 'up')).toBeNull();
    expect(getReorderSwapPair(rows, 'c', 'down')).toBeNull();
    expect(canMoveRow(rows, 'a', 'up')).toBe(false);
    expect(canMoveRow(rows, 'c', 'down')).toBe(false);
  });
});
