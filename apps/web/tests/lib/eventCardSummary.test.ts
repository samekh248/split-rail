import { describe, expect, it } from 'vitest';
import {
  eventHasBottleneckAlerts,
  filterRecentEventsByBottleneck,
} from '@/lib/eventCardSummary';
import type { EventCardDto } from '@/types/generated-api';

function card(overrides: Partial<EventCardDto> = {}): EventCardDto {
  return {
    eventId: overrides.eventId ?? '11111111-1111-1111-1111-111111111111',
    venueId: overrides.venueId ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: overrides.title ?? 'Test Show',
    eventDate: overrides.eventDate ?? '2026-06-01',
    status: overrides.status ?? 'PRE_SHOW',
    isBudgetLocked: overrides.isBudgetLocked ?? false,
    qboTagName: overrides.qboTagName ?? '',
    settlementPdfAvailable: overrides.settlementPdfAvailable ?? false,
    isPinned: overrides.isPinned ?? false,
    hasVarianceConcern: overrides.hasVarianceConcern ?? false,
    unmappedCount: overrides.unmappedCount ?? 0,
    lastSyncedAt: overrides.lastSyncedAt ?? null,
    ...overrides,
  };
}

describe('eventHasBottleneckAlerts', () => {
  it('returns true when unmappedCount > 0', () => {
    expect(eventHasBottleneckAlerts(card({ unmappedCount: 2 }))).toBe(true);
  });

  it('returns true when hasVarianceConcern is true', () => {
    expect(eventHasBottleneckAlerts(card({ hasVarianceConcern: true }))).toBe(true);
  });

  it('returns true for settled not synced via summary', () => {
    expect(
      eventHasBottleneckAlerts(
        card({ status: 'SETTLED', lastSyncedAt: null, hasVarianceConcern: false, unmappedCount: 0 }),
      ),
    ).toBe(true);
  });

  it('returns true for missing signature fallback', () => {
    expect(
      eventHasBottleneckAlerts(
        card({
          status: 'PRE_SHOW',
          isBudgetLocked: true,
          settlementPdfAvailable: false,
        }),
      ),
    ).toBe(true);
  });

  it('returns false when no alert conditions apply', () => {
    expect(
      eventHasBottleneckAlerts(
        card({
          status: 'PRE_SHOW',
          isBudgetLocked: false,
          unmappedCount: 0,
          hasVarianceConcern: false,
        }),
      ),
    ).toBe(false);
  });
});

describe('filterRecentEventsByBottleneck', () => {
  const clean = card({ eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Clean' });
  const alerted = card({ eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', title: 'Alerted', unmappedCount: 1 });
  const events = [clean, alerted];

  it('returns original list when filter inactive', () => {
    expect(filterRecentEventsByBottleneck(events, false)).toBe(events);
  });

  it('returns only alerted events when filter active', () => {
    expect(filterRecentEventsByBottleneck(events, true)).toEqual([alerted]);
  });
});
