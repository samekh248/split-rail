import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_DISPLAY_FORMAT,
  formatDateTimeWithPreference,
  formatTimeRangeWithPreference,
  formatTimeRangeWithWord,
  formatTimeWithPreference,
  resolveTimeDisplayFormat,
  setTimeDisplayFormat,
} from '@/lib/timeDisplayFormat';

describe('timeDisplayFormat', () => {
  beforeEach(() => {
    setTimeDisplayFormat(DEFAULT_TIME_DISPLAY_FORMAT);
  });

  it('falls back to the default format for unknown values', () => {
    expect(resolveTimeDisplayFormat(undefined)).toBe('12h');
    expect(resolveTimeDisplayFormat('invalid')).toBe('12h');
  });

  it('formats clock times in 12-hour mode', () => {
    setTimeDisplayFormat('12h');
    expect(formatTimeWithPreference('08:00')).toBe('8:00 AM');
    expect(formatTimeWithPreference('20:00')).toBe('8:00 PM');
    expect(formatTimeWithPreference('12:30')).toBe('12:30 PM');
  });

  it('formats clock times in 24-hour mode', () => {
    setTimeDisplayFormat('24h');
    expect(formatTimeWithPreference('08:00')).toBe('08:00');
    expect(formatTimeWithPreference('20:00')).toBe('20:00');
    expect(formatTimeWithPreference('24:00')).toBe('24:00');
  });

  it('formats time ranges with an en dash', () => {
    setTimeDisplayFormat('12h');
    expect(formatTimeRangeWithPreference('20:00', '21:30')).toBe('8:00 PM–9:30 PM');
    setTimeDisplayFormat('24h');
    expect(formatTimeRangeWithPreference('20:00', '21:30')).toBe('20:00–21:30');
  });

  it('formats time ranges with a word separator', () => {
    setTimeDisplayFormat('12h');
    expect(formatTimeRangeWithWord('20:00', '21:30')).toBe('8:00 PM to 9:30 PM');
  });

  it('formats timestamps using the active time preference', () => {
    setTimeDisplayFormat('24h');
    const formatted24 = formatDateTimeWithPreference('2026-08-14T20:00:00');
    expect(formatted24).toMatch(/Aug 14, 20:00/);
    setTimeDisplayFormat('12h');
    const formatted12 = formatDateTimeWithPreference('2026-08-14T20:00:00');
    expect(formatted12).toMatch(/Aug 14, 8:00 PM/);
  });
});
