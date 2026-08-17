import { describe, expect, it } from 'vitest';
import { blockGridStyle, buildTimeSlots } from '@/components/festival/timelineUtils';

describe('timelineUtils', () => {
  it('builds half-hour slots from 08:00 through 23:30', () => {
    const slots = buildTimeSlots();
    expect(slots[0]).toBe('08:00');
    expect(slots[1]).toBe('08:30');
    expect(slots.at(-1)).toBe('23:30');
    expect(slots).toHaveLength(32);
  });

  it('positions a block as a vertical span of the day column', () => {
    expect(
      blockGridStyle({
        id: 'block-1',
        title: 'Opening Act',
        startTime: '14:00',
        endTime: '15:00',
      }),
    ).toEqual({ top: '37.5%', height: '6.25%' });
  });
});
