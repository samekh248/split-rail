import type { DashboardResponse, EventCardDto } from '@/types/generated-api';
import { deriveAccountingWorkloadEvents } from '@/lib/accountingWorkload';

function card(overrides: Partial<EventCardDto> = {}): EventCardDto {
  return {
    eventId: overrides.eventId ?? 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    venueId: overrides.venueId ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: overrides.title ?? 'Show A',
    eventDate: overrides.eventDate ?? '2026-06-20',
    status: overrides.status ?? 'SETTLED',
    isBudgetLocked: overrides.isBudgetLocked ?? true,
    qboTagName: overrides.qboTagName ?? 'TAG',
    settlementPdfAvailable: overrides.settlementPdfAvailable ?? false,
    isPinned: false,
    hasVarianceConcern: false,
    unmappedCount: overrides.unmappedCount ?? 0,
    lastSyncedAt: overrides.lastSyncedAt ?? null,
    ...overrides,
  };
}

function dashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    pinnedEvents: [],
    tonightEvents: [],
    upcomingEvents: [],
    recentEvents: [],
    ...overrides,
  };
}

describe('deriveAccountingWorkloadEvents', () => {
  it('returns empty list when dashboard is undefined', () => {
    expect(deriveAccountingWorkloadEvents(undefined)).toEqual([]);
  });

  it('includes events with unmapped transactions', () => {
    const result = deriveAccountingWorkloadEvents(
      dashboard({
        recentEvents: [card({ unmappedCount: 3, title: 'Unmapped Show' })],
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Unmapped Show');
    expect(result[0]?.unmappedCount).toBe(3);
  });

  it('includes events with bottleneck alerts', () => {
    const result = deriveAccountingWorkloadEvents(
      dashboard({
        recentEvents: [
          card({
            status: 'SETTLED',
            qboTagName: 'TAG',
            unmappedCount: 0,
            title: 'Needs Sync',
          }),
        ],
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.alertLabels.length).toBeGreaterThan(0);
  });

  it('dedupes events appearing in multiple partitions', () => {
    const shared = card({ eventId: '11111111-1111-1111-1111-111111111111', unmappedCount: 2 });
    const result = deriveAccountingWorkloadEvents(
      dashboard({
        pinnedEvents: [shared],
        recentEvents: [shared],
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('sorts by unmapped count descending then event date', () => {
    const result = deriveAccountingWorkloadEvents(
      dashboard({
        recentEvents: [
          card({ eventId: '11111111-1111-1111-1111-111111111111', unmappedCount: 1, eventDate: '2026-06-21' }),
          card({ eventId: '22222222-2222-2222-2222-222222222222', unmappedCount: 5, eventDate: '2026-06-19' }),
        ],
      }),
    );
    expect(result[0]?.eventId).toBe('22222222-2222-2222-2222-222222222222');
    expect(result[1]?.eventId).toBe('11111111-1111-1111-1111-111111111111');
  });
});
