import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readUpcomingViewMode,
  writeUpcomingViewMode,
} from '@/lib/upcomingEventsViewStorage';

describe('upcomingEventsViewStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('defaults to list when storage is empty', () => {
    expect(readUpcomingViewMode()).toBe('list');
  });

  it('defaults to list for invalid stored values', () => {
    sessionStorage.setItem('split-rail:upcoming-events-view', 'grid');
    expect(readUpcomingViewMode()).toBe('list');
  });

  it('round-trips calendar mode', () => {
    writeUpcomingViewMode('calendar');
    expect(readUpcomingViewMode()).toBe('calendar');
  });

  it('round-trips list mode', () => {
    writeUpcomingViewMode('calendar');
    writeUpcomingViewMode('list');
    expect(readUpcomingViewMode()).toBe('list');
  });

  it('resets to list after sessionStorage clear', () => {
    writeUpcomingViewMode('calendar');
    sessionStorage.clear();
    expect(readUpcomingViewMode()).toBe('list');
  });

  it('defaults to list when sessionStorage throws on read', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(readUpcomingViewMode()).toBe('list');
    getItem.mockRestore();
  });

  it('ignores sessionStorage errors on write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(() => writeUpcomingViewMode('calendar')).not.toThrow();
    setItem.mockRestore();
  });
});
