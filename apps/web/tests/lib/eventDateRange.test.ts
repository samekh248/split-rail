import { describe, expect, it } from 'vitest';
import {
  eachDateKey,
  effectiveEndDate,
  formatEventDateRange,
  formatEventDateRangeLong,
  formatIsoDateRange,
} from '@/lib/eventDateRange';

describe('eventDateRange', () => {
  it('walks inclusive calendar days', () => {
    expect(eachDateKey('2026-08-14', '2026-08-16')).toEqual([
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]);
  });

  it('treats a missing end date as a single day', () => {
    expect(effectiveEndDate('2026-08-14', null)).toBe('2026-08-14');
    expect(eachDateKey('2026-08-14', undefined)).toEqual(['2026-08-14']);
  });

  it('formats a same-month festival range', () => {
    expect(formatEventDateRange('2026-08-14', '2026-08-16')).toBe('Aug 14–16, 2026');
  });

  it('formats a single day without a dash', () => {
    expect(formatEventDateRange('2026-08-14', '2026-08-14')).toBe('Aug 14, 2026');
    expect(formatIsoDateRange('2026-08-14', null)).toBe('2026-08-14');
  });

  it('formats ISO ranges for compact lists', () => {
    expect(formatIsoDateRange('2026-08-14', '2026-08-16')).toBe('2026-08-14 – 2026-08-16');
  });

  it('formats a long festival span with weekdays', () => {
    expect(formatEventDateRangeLong('2026-06-15', '2026-06-17')).toBe(
      'Mon, June 15 – Wed, June 17, 2026',
    );
  });

  it('formats a long cross-month span', () => {
    expect(formatEventDateRangeLong('2026-06-30', '2026-07-02')).toBe(
      'Tue, June 30 – Thu, July 2, 2026',
    );
  });

  it('formats a long single-day date without a dash', () => {
    expect(formatEventDateRangeLong('2026-06-26', null)).toBe('Fri, June 26, 2026');
  });
});
