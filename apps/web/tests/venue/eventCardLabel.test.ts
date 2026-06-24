import { describe, expect, it } from 'vitest';
import {
  formatStatusBadgeLabel,
  resolveDeleteActionHint,
  resolveEditActionHint,
} from '@/venue/eventCardLabel';
import { LIFECYCLE_GOLDEN_MATRIX } from './eventLifecycle.test';

describe('eventCardLabel', () => {
  describe('golden matrix G1–G8', () => {
    it.each(LIFECYCLE_GOLDEN_MATRIX)('$id resolves badge and action hints', (row) => {
      expect(formatStatusBadgeLabel(row.status, row.isBudgetLocked)).toBe(row.badge);
      expect(resolveEditActionHint(row.status, row.isBudgetLocked)).toBe(row.editHint);
      expect(resolveDeleteActionHint(row.status, row.isBudgetLocked)).toBe(row.deleteHint);
    });
  });
});
