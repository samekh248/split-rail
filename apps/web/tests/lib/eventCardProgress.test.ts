import { describe, expect, it } from 'vitest';
import {
  EVENT_CARD_PROGRESS_FILL_END,
  EVENT_CARD_PROGRESS_FILL_START,
  EVENT_CARD_PROGRESS_ORANGE_FULL_AT,
  getEventCardProgressAriaLabel,
  getEventCardProgressFillGradient,
  getEventCardProgressLabel,
  getMilestoneBarColor,
  getMilestoneBubbleState,
  resolveEventCardProgressPosition,
} from '@/lib/eventCardProgress';

const NOW = new Date(2026, 7, 15); // Aug 15, 2026 local

function futureDate(): string {
  return '2099-01-15';
}

function pastDate(): string {
  return '2020-01-15';
}

function todayDate(): string {
  return '2026-08-15';
}

describe('resolveEventCardProgressPosition', () => {
  it('resolves Hold 1 to holds milestone', () => {
    const result = resolveEventCardProgressPosition('HOLD_1', futureDate(), NOW);
    expect(result).toEqual({
      activeMilestone: 'holds',
      isCancelled: false,
      fillPercent: 12.5,
    });
  });

  it('resolves Hold 2 to same holds position as Hold 1', () => {
    const hold1 = resolveEventCardProgressPosition('HOLD_1', futureDate(), NOW);
    const hold2 = resolveEventCardProgressPosition('HOLD_2', futureDate(), NOW);
    expect(hold2).toEqual(hold1);
  });

  it('resolves confirmed upcoming to confirmed milestone', () => {
    const result = resolveEventCardProgressPosition('CONFIRMED', futureDate(), NOW);
    expect(result.activeMilestone).toBe('confirmed');
    expect(result.fillPercent).toBe(37.5);
  });

  it('resolves show day to eventDate milestone', () => {
    const result = resolveEventCardProgressPosition('CONFIRMED', todayDate(), NOW);
    expect(result.activeMilestone).toBe('eventDate');
    expect(result.fillPercent).toBe(62.5);
  });

  it('resolves post-event to postEvent milestone', () => {
    const result = resolveEventCardProgressPosition('CONFIRMED', pastDate(), NOW);
    expect(result.activeMilestone).toBe('postEvent');
    expect(result.fillPercent).toBe(100);
  });

  it('treats legacy null placement as confirmed then post-event when past', () => {
    const result = resolveEventCardProgressPosition(null, pastDate(), NOW);
    expect(result.activeMilestone).toBe('postEvent');
  });

  it('caps at confirmed when event date is missing', () => {
    const result = resolveEventCardProgressPosition('CONFIRMED', null, NOW);
    expect(result.activeMilestone).toBe('confirmed');
  });

  it('returns cancelled state with no active milestone', () => {
    const result = resolveEventCardProgressPosition('CANCELLED', futureDate(), NOW);
    expect(result).toEqual({
      activeMilestone: null,
      isCancelled: true,
      fillPercent: 0,
    });
  });

  it('hold on show day takes precedence over calendar date', () => {
    const result = resolveEventCardProgressPosition('HOLD_1', todayDate(), NOW);
    expect(result.activeMilestone).toBe('holds');
  });

  it('falls back to confirmed for unrecognized placement values', () => {
    const result = resolveEventCardProgressPosition('UNKNOWN', futureDate(), NOW);
    expect(result.activeMilestone).toBe('confirmed');
  });
});

describe('getMilestoneBubbleState', () => {
  it('marks all bubbles cancelled when placement is cancelled', () => {
    const position = resolveEventCardProgressPosition('CANCELLED', futureDate(), NOW);
    expect(getMilestoneBubbleState('holds', position)).toBe('cancelled');
    expect(getMilestoneBubbleState('postEvent', position)).toBe('cancelled');
  });

  it('marks completed and upcoming bubbles for confirmed placement', () => {
    const position = resolveEventCardProgressPosition('CONFIRMED', futureDate(), NOW);
    expect(getMilestoneBubbleState('holds', position)).toBe('completed');
    expect(getMilestoneBubbleState('confirmed', position)).toBe('active');
    expect(getMilestoneBubbleState('eventDate', position)).toBe('upcoming');
  });

  it('returns upcoming when active milestone is null and not cancelled', () => {
    expect(
      getMilestoneBubbleState('holds', {
        activeMilestone: null,
        isCancelled: false,
        fillPercent: 0,
      }),
    ).toBe('upcoming');
  });
});

describe('getMilestoneBarColor', () => {
  it('shifts from orange toward brown along milestone positions', () => {
    const holds = getMilestoneBarColor('holds');
    const confirmed = getMilestoneBarColor('confirmed');
    const postEvent = getMilestoneBarColor('postEvent');

    expect(holds).toContain('var(--color-primary-brown)');
    expect(postEvent).toContain('var(--color-accent-orange)');
    expect(holds).not.toBe(postEvent);
    expect(confirmed).not.toBe(holds);
    expect(confirmed).not.toBe(postEvent);
  });
});

describe('getEventCardProgressFillGradient', () => {
  it('reaches full orange early and keeps it through the end of the bar', () => {
    const gradient = getEventCardProgressFillGradient();

    expect(gradient).toContain(EVENT_CARD_PROGRESS_FILL_START);
    expect(gradient).toContain(EVENT_CARD_PROGRESS_FILL_END);
    expect(EVENT_CARD_PROGRESS_FILL_START).toContain('50%');
    expect(EVENT_CARD_PROGRESS_FILL_END).toContain('78%');
    expect(gradient).toContain(`${EVENT_CARD_PROGRESS_ORANGE_FULL_AT}%`);
  });
});

describe('labels and aria', () => {
  it('returns full and abbreviated milestone labels', () => {
    expect(getEventCardProgressLabel('eventDate')).toBe('Event date');
    expect(getEventCardProgressLabel('eventDate', true)).toBe('Show');
  });

  it('returns cancelled aria label', () => {
    const position = resolveEventCardProgressPosition('CANCELLED', futureDate(), NOW);
    expect(getEventCardProgressAriaLabel(position)).toContain('Cancelled');
  });
});
