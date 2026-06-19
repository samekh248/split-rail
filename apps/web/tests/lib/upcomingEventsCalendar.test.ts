import { describe, expect, it } from 'vitest';
import {
  buildMiniCalendarWeeks,
  getUpcomingWindowBounds,
  groupEventsByLocalDate,
  toDateKey,
  truncateEventTitle,
} from '@/lib/upcomingEventsCalendar';
import type { EventCardDto } from '@/types/generated-api';

const REF_NOW = new Date(2026, 5, 18, 12, 0, 0);

function event(id: string, eventDate: string, title?: string): EventCardDto {
  return {
    eventId: id,
    venueId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: title ?? `Event ${id.slice(0, 4)}`,
    eventDate,
  };
}

describe('upcomingEventsCalendar', () => {
  it('computes tomorrow through today+30 inclusive window', () => {
    const bounds = getUpcomingWindowBounds(REF_NOW);
    expect(toDateKey(bounds.start)).toBe('2026-06-19');
    expect(toDateKey(bounds.end)).toBe('2026-07-18');
  });

  it('groups multiple events on the same local date', () => {
    const grouped = groupEventsByLocalDate([
      event('11111111-1111-1111-1111-111111111111', '2026-06-20'),
      event('22222222-2222-2222-2222-222222222222', '2026-06-20'),
      event('33333333-3333-3333-3333-333333333333', '2026-06-21'),
    ]);

    expect(grouped.get('2026-06-20')?.map((e) => e.eventId)).toEqual([
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ]);
    expect(grouped.get('2026-06-21')?.length).toBe(1);
  });

  it('skips events with unparseable dates', () => {
    const grouped = groupEventsByLocalDate([
      event('11111111-1111-1111-1111-111111111111', 'not-a-date'),
    ]);
    expect(grouped.size).toBe(0);
  });

  it('returns null for missing event dates', () => {
    expect(groupEventsByLocalDate([{ eventId: 'x', eventDate: null }])).toEqual(new Map());
  });

  it('parses ISO date-time strings to local calendar days', () => {
    const grouped = groupEventsByLocalDate([
      event('11111111-1111-1111-1111-111111111111', '2026-06-20T15:00:00'),
    ]);
    expect(grouped.has('2026-06-20')).toBe(true);
  });

  it('truncates long titles with ellipsis', () => {
    expect(truncateEventTitle('Short title')).toBe('Short title');
    expect(truncateEventTitle(null)).toBe('Untitled event');
    const long = 'A'.repeat(30);
    expect(truncateEventTitle(long, 10)).toBe(`${'A'.repeat(9)}…`);
  });

  it('includes window dates across month boundary in one grid', () => {
    const weeks = buildMiniCalendarWeeks(REF_NOW);
    const keys = weeks.flatMap((week) => week.days.map((day) => day.dateKey));

    expect(keys).toContain('2026-06-19');
    expect(keys).toContain('2026-07-18');
    expect(keys[0]).toMatch(/2026-05-/);
    expect(keys.at(-1)).toMatch(/2026-07-/);
  });

  it('marks in-window and adjacent-month days', () => {
    const weeks = buildMiniCalendarWeeks(REF_NOW);
    const june19 = weeks.flatMap((w) => w.days).find((d) => d.dateKey === '2026-06-19');
    const july18 = weeks.flatMap((w) => w.days).find((d) => d.dateKey === '2026-07-18');
    const padding = weeks.flatMap((w) => w.days).find((d) => d.dateKey === '2026-05-31');

    expect(june19?.inWindow).toBe(true);
    expect(june19?.isAdjacentMonth).toBe(false);
    expect(july18?.inWindow).toBe(true);
    expect(july18?.isAdjacentMonth).toBe(true);
    expect(padding?.inWindow).toBe(false);
    expect(padding?.isAdjacentMonth).toBe(true);
  });

  it('renders complete seven-day weeks', () => {
    const weeks = buildMiniCalendarWeeks(REF_NOW);
    for (const week of weeks) {
      expect(week.days).toHaveLength(7);
    }
  });
});
