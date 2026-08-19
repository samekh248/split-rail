import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DATE_DISPLAY_FORMAT,
  formatDateLabelFromIso,
  formatDateRangeFromIso,
  formatDateRangeLongFromIso,
  formatDateWithPreference,
  resolveDateDisplayFormat,
  setDateDisplayFormat,
} from '@/lib/dateDisplayFormat';

describe('dateDisplayFormat', () => {
  beforeEach(() => {
    setDateDisplayFormat(DEFAULT_DATE_DISPLAY_FORMAT);
  });

  it('defaults to MM/dd/yyyy', () => {
    expect(resolveDateDisplayFormat(undefined)).toBe('MM/dd/yyyy');
    expect(formatDateLabelFromIso('2026-08-14')).toBe('08/14/2026');
  });

  it('formats other supported patterns', () => {
    expect(formatDateWithPreference(new Date(2026, 7, 14), 'dd/MM/yyyy')).toBe('14/08/2026');
    expect(formatDateWithPreference(new Date(2026, 7, 14), 'yyyy-MM-dd')).toBe('2026-08-14');
    expect(formatDateWithPreference(new Date(2026, 7, 14), 'MMM d, yyyy')).toBe('Aug 14, 2026');
  });

  it('formats ranges using the active preference', () => {
    setDateDisplayFormat('yyyy-MM-dd');
    expect(formatDateRangeFromIso('2026-08-14', '2026-08-16')).toBe(
      '2026-08-14 – 2026-08-16',
    );
    expect(formatDateRangeLongFromIso('2026-06-15', '2026-06-17')).toBe(
      'Mon, 2026-06-15 – Wed, 2026-06-17',
    );
  });

  it('keeps compact month-name ranges for the readable format', () => {
    setDateDisplayFormat('MMM d, yyyy');
    expect(formatDateRangeFromIso('2026-08-14', '2026-08-16')).toBe('Aug 14–16, 2026');
  });
});
