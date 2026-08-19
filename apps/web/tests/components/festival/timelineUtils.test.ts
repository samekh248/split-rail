import { describe, expect, it } from 'vitest';
import {
  blockGridStyle,
  buildCreateSeed,
  buildTimeSlots,
  clampToDayBounds,
  detectSameStageOverlap,
  findActiveBlockAtSlot,
  isSlotInGesturePreview,
  placeBlockStart,
  pointerMinutesInColumn,
  resizeBlockBound,
  snapMinutesToSlot,
} from '@/components/festival/timelineUtils';
import type { ProgrammingBlockResponse } from '@/types/generated-api';

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

  describe('snapMinutesToSlot', () => {
    it('rounds to the nearest 30-minute boundary', () => {
      expect(snapMinutesToSlot(14 * 60 + 10)).toBe(14 * 60);
      expect(snapMinutesToSlot(14 * 60 + 20)).toBe(14 * 60 + 30);
      expect(snapMinutesToSlot(14 * 60 + 15)).toBe(14 * 60 + 30);
    });
  });

  describe('clampToDayBounds', () => {
    it('clamps below the day start to 08:00', () => {
      expect(clampToDayBounds(6 * 60)).toBe(8 * 60);
    });

    it('clamps above the day end to 24:00', () => {
      expect(clampToDayBounds(25 * 60)).toBe(24 * 60);
    });

    it('leaves in-bounds minutes unchanged', () => {
      expect(clampToDayBounds(14 * 60)).toBe(14 * 60);
    });
  });

  describe('resizeBlockBound', () => {
    const block = { startTime: '14:00', endTime: '15:00' };

    it('moves only the end bound when resizing the end edge', () => {
      expect(resizeBlockBound(block, 'end', timeToMinutesLocal('15:30'))).toEqual({
        startTime: '14:00',
        endTime: '15:30',
      });
    });

    it('moves only the start bound when resizing the start edge', () => {
      expect(resizeBlockBound(block, 'start', timeToMinutesLocal('13:30'))).toEqual({
        startTime: '13:30',
        endTime: '15:00',
      });
    });

    it('refuses a resize that would drop duration below one interval', () => {
      // Snaps to the same value as the pinned opposite bound, i.e. zero duration.
      expect(resizeBlockBound(block, 'start', timeToMinutesLocal('14:50'))).toBeNull();
      expect(resizeBlockBound(block, 'end', timeToMinutesLocal('14:10'))).toBeNull();
    });

    it('refuses a resize that would push a bound past the visible day bounds', () => {
      const lateBlock = { startTime: '23:30', endTime: '24:00' };
      expect(resizeBlockBound(lateBlock, 'end', timeToMinutesLocal('24:00') + 60)).toBeNull();
      const earlyBlock = { startTime: '08:30', endTime: '09:00' };
      expect(resizeBlockBound(earlyBlock, 'start', timeToMinutesLocal('08:00') - 60)).toBeNull();
    });

    it('allows a resize exactly to the day boundary', () => {
      const earlyBlock = { startTime: '08:30', endTime: '09:00' };
      expect(resizeBlockBound(earlyBlock, 'start', timeToMinutesLocal('08:00'))).toEqual({
        startTime: '08:00',
        endTime: '09:00',
      });
    });
  });

  describe('pointerMinutesInColumn', () => {
    // A column 640px tall spanning 08:00–24:00 (960 minutes) → 1.5 minutes per pixel.
    const top = 100;
    const height = 640;

    it('maps the top of the column to the start of the visible day', () => {
      expect(pointerMinutesInColumn(100, top, height)).toBe(8 * 60);
    });

    it('maps the bottom of the column to the end of the visible day', () => {
      expect(pointerMinutesInColumn(740, top, height)).toBe(24 * 60);
    });

    it('resolves sub-cell positions continuously rather than per row', () => {
      expect(pointerMinutesInColumn(420, top, height)).toBe(16 * 60);
      // 10px lower is 15 minutes later — resolution far finer than a 30-minute row.
      expect(pointerMinutesInColumn(430, top, height)).toBe(16 * 60 + 15);
    });

    it('extrapolates past the column edges so a drag beyond the board still tracks', () => {
      expect(pointerMinutesInColumn(80, top, height)).toBeLessThan(8 * 60);
      expect(pointerMinutesInColumn(800, top, height)).toBeGreaterThan(24 * 60);
    });

    it('falls back to the day start for an unmeasurable column', () => {
      expect(pointerMinutesInColumn(500, top, 0)).toBe(8 * 60);
    });
  });

  describe('placeBlockStart', () => {
    it('snaps the candidate start to the nearest interval', () => {
      expect(placeBlockStart(timeToMinutesLocal('14:38'), 60)).toEqual({
        startTime: '14:30',
        endTime: '15:30',
      });
    });

    it('clamps to the day start rather than refusing the placement', () => {
      expect(placeBlockStart(timeToMinutesLocal('06:00'), 60)).toEqual({
        startTime: '08:00',
        endTime: '09:00',
      });
    });

    it('clamps so the whole block stays inside the day end', () => {
      expect(placeBlockStart(timeToMinutesLocal('23:30'), 60)).toEqual({
        startTime: '23:00',
        endTime: '24:00',
      });
    });

    it('keeps a block longer than the visible day pinned to the day start', () => {
      expect(placeBlockStart(timeToMinutesLocal('20:00'), 20 * 60).startTime).toBe('08:00');
    });
  });

  describe('buildCreateSeed', () => {
    it('defaults the end time to one interval after the clicked start', () => {
      expect(buildCreateSeed('2026-08-14', 'stage-1', '14:00')).toEqual({
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '14:30',
      });
    });
  });

  describe('findActiveBlockAtSlot', () => {
    const blocks: ProgrammingBlockResponse[] = [
      {
        id: 'block-1',
        title: 'Opening Act',
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
        scheduleStatus: 'SCHEDULED',
      },
      {
        id: 'block-2',
        title: 'Canceled Act',
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '16:00',
        endTime: '17:00',
        scheduleStatus: 'CANCELED',
      },
    ];

    it('finds the active block covering a slot', () => {
      expect(findActiveBlockAtSlot(blocks, 'stage-1', '14:00')?.id).toBe('block-1');
      expect(findActiveBlockAtSlot(blocks, 'stage-1', '14:30')?.id).toBe('block-1');
    });

    it('returns null for an empty slot', () => {
      expect(findActiveBlockAtSlot(blocks, 'stage-1', '15:00')).toBeNull();
    });

    it('ignores canceled blocks', () => {
      expect(findActiveBlockAtSlot(blocks, 'stage-1', '16:00')).toBeNull();
    });
  });

  describe('isSlotInGesturePreview', () => {
    const preview = { stageZoneId: 'stage-1', startTime: '14:00', endTime: '15:00' };

    it('is true for slots within the preview range on the same stage', () => {
      expect(isSlotInGesturePreview(preview, 'stage-1', '14:00')).toBe(true);
      expect(isSlotInGesturePreview(preview, 'stage-1', '14:30')).toBe(true);
    });

    it('is false at or past the end boundary', () => {
      expect(isSlotInGesturePreview(preview, 'stage-1', '15:00')).toBe(false);
    });

    it('is false on a different stage', () => {
      expect(isSlotInGesturePreview(preview, 'stage-2', '14:00')).toBe(false);
    });

    it('is false when there is no preview', () => {
      expect(isSlotInGesturePreview(null, 'stage-1', '14:00')).toBe(false);
    });
  });

  describe('detectSameStageOverlap (reused for resize/create candidates)', () => {
    const blocks: ProgrammingBlockResponse[] = [
      {
        id: 'block-1',
        title: 'Opening Act',
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '14:00',
        endTime: '15:00',
        scheduleStatus: 'SCHEDULED',
      },
      {
        id: 'block-2',
        title: 'Canceled Act',
        dayDate: '2026-08-14',
        stageZoneId: 'stage-1',
        startTime: '15:00',
        endTime: '16:00',
        scheduleStatus: 'CANCELED',
      },
    ];

    it('does not treat a canceled block as a conflict', () => {
      const conflict = detectSameStageOverlap(blocks, {
        stageZoneId: 'stage-1',
        dayDate: '2026-08-14',
        startTime: '15:00',
        endTime: '16:00',
      });
      expect(conflict).toBeNull();
    });

    it('detects an active same-stage overlap', () => {
      const conflict = detectSameStageOverlap(blocks, {
        stageZoneId: 'stage-1',
        dayDate: '2026-08-14',
        startTime: '14:30',
        endTime: '15:30',
      });
      expect(conflict?.id).toBe('block-1');
    });
  });
});

function timeToMinutesLocal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
