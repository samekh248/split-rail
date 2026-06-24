export type MoveDirection = 'up' | 'down';

export interface SortableRow {
  id?: string;
  sortOrder?: number | null;
}

export function getReorderSwapPair<T extends SortableRow>(
  rows: T[],
  rowId: string,
  direction: MoveDirection,
): { current: T; neighbor: T } | null {
  const sorted = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const index = sorted.findIndex((row) => row.id === rowId);
  if (index === -1) return null;

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= sorted.length) return null;

  return { current: sorted[index], neighbor: sorted[neighborIndex] };
}

export function canMoveRow<T extends SortableRow>(
  rows: T[],
  rowId: string,
  direction: MoveDirection,
): boolean {
  return getReorderSwapPair(rows, rowId, direction) !== null;
}

export function nextSortOrder(rows: SortableRow[]): number {
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((row) => row.sortOrder ?? 0)) + 1;
}
