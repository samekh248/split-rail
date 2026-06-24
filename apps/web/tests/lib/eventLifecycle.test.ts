import { describe, expect, it } from 'vitest';
import { deriveBottleneckAlerts, deriveLifecyclePhase, selectTonightHero } from '@/lib/eventLifecycle';
import type { EventResponse } from '@/types/generated-api';
import { EVENT_A } from '../fixtures/events';

const REF_NOW = new Date(2026, 5, 18); // 2026-06-18 local

describe('deriveLifecyclePhase', () => {
  it('returns PreShow for unlocked PRE_SHOW', () => {
    expect(
      deriveLifecyclePhase(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: false, eventDate: '2026-08-01' },
        REF_NOW,
      ),
    ).toBe('PreShow');
  });

  it('returns NightOf for locked PRE_SHOW', () => {
    expect(
      deriveLifecyclePhase(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: true, eventDate: '2026-08-01' },
        REF_NOW,
      ),
    ).toBe('NightOf');
  });

  it('returns NightOf when event date is today', () => {
    expect(
      deriveLifecyclePhase(
        { ...EVENT_A, status: 'PRE_SHOW', isBudgetLocked: false, eventDate: '2026-06-18' },
        REF_NOW,
      ),
    ).toBe('NightOf');
  });

  it('returns PostShow for past settled event', () => {
    expect(
      deriveLifecyclePhase(
        { ...EVENT_A, status: 'SETTLED', isBudgetLocked: true, eventDate: '2026-05-01' },
        REF_NOW,
      ),
    ).toBe('PostShow');
  });

  it('returns Unknown for unrecognized status', () => {
    expect(
      deriveLifecyclePhase({ ...EVENT_A, status: 'INVALID', eventDate: '2026-08-01' }, REF_NOW),
    ).toBe('Unknown');
  });
});

describe('deriveBottleneckAlerts', () => {
  it('flags missing signature when budget locked without PDF', () => {
    const alerts = deriveBottleneckAlerts({
      ...EVENT_A,
      status: 'PRE_SHOW',
      isBudgetLocked: true,
      settlementPdfAvailable: false,
    });
    expect(alerts.some((a) => a.kind === 'MISSING_SIGNATURE')).toBe(true);
  });

  it('flags settled not synced when settled with qbo tag', () => {
    const alerts = deriveBottleneckAlerts({
      ...EVENT_A,
      status: 'SETTLED',
      qboTagName: 'show-tag',
    });
    expect(alerts.some((a) => a.kind === 'SETTLED_NOT_SYNCED')).toBe(true);
    expect(alerts.some((a) => a.kind === 'VARIANCE_REVIEW')).toBe(true);
  });
});

describe('selectTonightHero', () => {
  it('returns null for empty event list', () => {
    expect(selectTonightHero([], REF_NOW)).toBeNull();
  });

  it('breaks ties by event date when phases match', () => {
    const preShow: EventResponse = {
      ...EVENT_A,
      eventId: '11111111-1111-1111-1111-111111111111',
      status: 'PRE_SHOW',
      isBudgetLocked: false,
      eventDate: '2026-08-01',
    };
    const nightOf: EventResponse = {
      ...EVENT_A,
      eventId: '22222222-2222-2222-2222-222222222222',
      status: 'PRE_SHOW',
      isBudgetLocked: true,
      eventDate: '2026-08-02',
    };
    expect(selectTonightHero([preShow, nightOf], REF_NOW)?.eventId).toBe(nightOf.eventId);
  });
});
