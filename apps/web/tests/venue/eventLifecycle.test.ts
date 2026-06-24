import { describe, expect, it } from 'vitest';
import {
  canDeleteEvent,
  canEditEventMetadata,
  isEventFullyLocked,
  isPreShow,
  resolveLifecyclePhase,
} from '@/venue/eventLifecycle';

export const LIFECYCLE_GOLDEN_MATRIX = [
  {
    id: 'G1',
    status: 'PRE_SHOW' as const,
    isBudgetLocked: false,
    phase: 'planning-unlocked',
    canEditMetadata: true,
    canDelete: true,
    badge: 'Planning',
    editHint: null,
    deleteHint: null,
  },
  {
    id: 'G2',
    status: 'PRE_SHOW' as const,
    isBudgetLocked: undefined,
    phase: 'planning-unlocked',
    canEditMetadata: true,
    canDelete: true,
    badge: 'Planning',
    editHint: null,
    deleteHint: null,
  },
  {
    id: 'G3',
    status: 'PRE_SHOW' as const,
    isBudgetLocked: true,
    phase: 'planning-locked',
    canEditMetadata: true,
    canDelete: false,
    badge: 'Budget locked',
    editHint: null,
    deleteHint: 'Budget locked',
  },
  {
    id: 'G4',
    status: 'SETTLED' as const,
    isBudgetLocked: false,
    phase: 'settled',
    canEditMetadata: false,
    canDelete: false,
    badge: 'Settled',
    editHint: 'Event locked',
    deleteHint: 'Event locked',
  },
  {
    id: 'G5',
    status: 'SETTLED' as const,
    isBudgetLocked: true,
    phase: 'settled',
    canEditMetadata: false,
    canDelete: false,
    badge: 'Settled',
    editHint: 'Event locked',
    deleteHint: 'Event locked',
  },
  {
    id: 'G6',
    status: 'RECONCILED' as const,
    isBudgetLocked: false,
    phase: 'reconciled',
    canEditMetadata: false,
    canDelete: false,
    badge: 'Reconciled',
    editHint: 'Event locked',
    deleteHint: 'Event locked',
  },
  {
    id: 'G7',
    status: null,
    isBudgetLocked: false,
    phase: 'unknown',
    canEditMetadata: false,
    canDelete: false,
    badge: 'Unknown',
    editHint: 'Event locked',
    deleteHint: 'Event locked',
  },
  {
    id: 'G8',
    status: 'INVALID',
    isBudgetLocked: false,
    phase: 'unknown',
    canEditMetadata: false,
    canDelete: false,
    badge: 'Unknown',
    editHint: 'Event locked',
    deleteHint: 'Event locked',
  },
] as const;

describe('eventLifecycle', () => {
  describe('golden matrix G1–G8', () => {
    it.each(LIFECYCLE_GOLDEN_MATRIX)('$id resolves lifecycle phase and permissions', (row) => {
      expect(resolveLifecyclePhase(row.status, row.isBudgetLocked)).toBe(row.phase);
      expect(isPreShow(row.status)).toBe(row.status === 'PRE_SHOW');
      expect(canEditEventMetadata(row.status, row.isBudgetLocked)).toBe(row.canEditMetadata);
      expect(canDeleteEvent(row.status, row.isBudgetLocked)).toBe(row.canDelete);
      expect(isEventFullyLocked(row.status, row.isBudgetLocked)).toBe(
        row.status === 'SETTLED' || row.status === 'RECONCILED',
      );
    });
  });

  describe('edge cases', () => {
    it('treats undefined status as unknown phase', () => {
      expect(resolveLifecyclePhase(undefined, false)).toBe('unknown');
      expect(canEditEventMetadata(undefined, false)).toBe(false);
      expect(canDeleteEvent(undefined, false)).toBe(false);
    });

    it('accepts EventResponse-shaped input for permission helpers', () => {
      expect(
        canEditEventMetadata({ status: 'PRE_SHOW', isBudgetLocked: true }),
      ).toBe(true);
      expect(
        canDeleteEvent({ status: 'PRE_SHOW', isBudgetLocked: true }),
      ).toBe(false);
    });

    it('ignores budget lock flag when status is settled or reconciled', () => {
      expect(resolveLifecyclePhase('SETTLED', true)).toBe('settled');
      expect(resolveLifecyclePhase('RECONCILED', true)).toBe('reconciled');
      expect(canDeleteEvent('SETTLED', true)).toBe(false);
    });
  });
});
