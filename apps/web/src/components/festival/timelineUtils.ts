import type { ProgrammingBlockResponse } from '@/types/generated-api';

export const TIMELINE_SLOT_MINUTES = 30;
export const TIMELINE_START_HOUR = 8;
export const TIMELINE_END_HOUR = 24;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (
    let minute = TIMELINE_START_HOUR * 60;
    minute < TIMELINE_END_HOUR * 60;
    minute += TIMELINE_SLOT_MINUTES
  ) {
    slots.push(minutesToTime(minute));
  }
  return slots;
}

export function blocksOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function isActiveScheduleStatus(status: string | null | undefined): boolean {
  return status === 'SCHEDULED' || status === 'DELAYED';
}

export function detectSameStageOverlap(
  blocks: ProgrammingBlockResponse[],
  candidate: {
    id?: string;
    stageZoneId: string;
    dayDate: string;
    startTime: string;
    endTime: string;
  },
): ProgrammingBlockResponse | null {
  for (const block of blocks) {
    if (block.id === candidate.id) {
      continue;
    }
    if (block.stageZoneId !== candidate.stageZoneId || block.dayDate !== candidate.dayDate) {
      continue;
    }
    if (!isActiveScheduleStatus(block.scheduleStatus)) {
      continue;
    }
    if (
      blocksOverlap(
        candidate.startTime,
        candidate.endTime,
        block.startTime ?? '',
        block.endTime ?? '',
      )
    ) {
      return block;
    }
  }
  return null;
}

export function formatDaySwitcherLabel(dayDate: string): string {
  const date = new Date(`${dayDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dayDate;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function blockDurationMinutes(block: ProgrammingBlockResponse): number {
  return timeToMinutes(block.endTime ?? '00:00') - timeToMinutes(block.startTime ?? '00:00');
}

export function blockGridStyle(block: ProgrammingBlockResponse): {
  top: string;
  height: string;
} {
  const startMinutes = timeToMinutes(block.startTime ?? '00:00');
  const endMinutes = timeToMinutes(block.endTime ?? '00:00');
  const timelineStart = TIMELINE_START_HOUR * 60;
  const timelineEnd = TIMELINE_END_HOUR * 60;
  const totalMinutes = timelineEnd - timelineStart;
  const topPct = ((startMinutes - timelineStart) / totalMinutes) * 100;
  const heightPct = ((endMinutes - startMinutes) / totalMinutes) * 100;
  return {
    top: `${Math.max(0, topPct)}%`,
    height: `${Math.max(2, heightPct)}%`,
  };
}

/**
 * Pointer travel (px) before a press becomes a drag. Small enough that a drag feels
 * immediate, large enough that a click with a shaky hand still opens the editor.
 */
export const DRAG_THRESHOLD_PX = 4;

/** Rounds raw pointer minutes to the nearest 30-minute grid boundary. */
export function snapMinutesToSlot(minutes: number): number {
  return Math.round(minutes / TIMELINE_SLOT_MINUTES) * TIMELINE_SLOT_MINUTES;
}

/**
 * Continuous minutes for a pointer Y within a stage column's box. The column spans exactly
 * the visible day, so this is a straight proportional map — giving pixel-resolution tracking
 * instead of waiting for the pointer to cross a whole 30-minute cell.
 */
export function pointerMinutesInColumn(
  clientY: number,
  columnTop: number,
  columnHeight: number,
): number {
  const dayStart = TIMELINE_START_HOUR * 60;
  if (columnHeight <= 0) {
    return dayStart;
  }
  const ratio = (clientY - columnTop) / columnHeight;
  return dayStart + ratio * (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
}

/**
 * Places a block of a fixed duration at a candidate start, snapped to the grid and clamped so
 * the whole block stays inside the visible day (rather than refusing the drop outright).
 */
export function placeBlockStart(
  candidateStartMinutes: number,
  durationMinutes: number,
): { startTime: string; endTime: string } {
  const dayStart = TIMELINE_START_HOUR * 60;
  const dayEnd = TIMELINE_END_HOUR * 60;
  const latestStart = Math.max(dayStart, dayEnd - durationMinutes);
  const snapped = snapMinutesToSlot(candidateStartMinutes);
  const start = Math.min(Math.max(snapped, dayStart), latestStart);
  return { startTime: minutesToTime(start), endTime: minutesToTime(start + durationMinutes) };
}

/** Clamps minutes to the visible timeline day window (08:00–24:00). */
export function clampToDayBounds(minutes: number): number {
  const start = TIMELINE_START_HOUR * 60;
  const end = TIMELINE_END_HOUR * 60;
  return Math.min(Math.max(minutes, start), end);
}

/**
 * Computes the new start/end for a single-edge resize. Snaps and clamps the dragged
 * bound, then refuses (returns null) if the resulting duration would drop below one
 * timeline interval — the other bound never moves.
 */
export function resizeBlockBound(
  block: { startTime?: string | null; endTime?: string | null },
  edge: 'start' | 'end',
  candidateMinutes: number,
): { startTime: string; endTime: string } | null {
  const snapped = snapMinutesToSlot(candidateMinutes);
  if (snapped < TIMELINE_START_HOUR * 60 || snapped > TIMELINE_END_HOUR * 60) {
    return null;
  }

  const startMinutes = timeToMinutes(block.startTime ?? '00:00');
  const endMinutes = timeToMinutes(block.endTime ?? '00:00');

  if (edge === 'start') {
    if (endMinutes - snapped < TIMELINE_SLOT_MINUTES) {
      return null;
    }
    return { startTime: minutesToTime(snapped), endTime: minutesToTime(endMinutes) };
  }

  if (snapped - startMinutes < TIMELINE_SLOT_MINUTES) {
    return null;
  }
  return { startTime: minutesToTime(startMinutes), endTime: minutesToTime(snapped) };
}

/** Builds the create-from-slot seed: end defaults to one timeline interval after start. */
export function buildCreateSeed(
  dayDate: string,
  stageZoneId: string,
  startTime: string,
): { dayDate: string; stageZoneId: string; startTime: string; endTime: string } {
  return {
    dayDate,
    stageZoneId,
    startTime,
    endTime: minutesToTime(timeToMinutes(startTime) + TIMELINE_SLOT_MINUTES),
  };
}

/**
 * Finds the active block (if any) covering a given stage+slot. Used so a click on the
 * grid at an occupied time always resolves to that block, even if the pointer landed on
 * the underlying slot cell rather than the block card itself.
 */
export function findActiveBlockAtSlot(
  blocks: ProgrammingBlockResponse[],
  stageZoneId: string,
  slotTime: string,
): ProgrammingBlockResponse | null {
  const slotMinutes = timeToMinutes(slotTime);
  return (
    blocks.find(
      (block) =>
        block.stageZoneId === stageZoneId &&
        isActiveScheduleStatus(block.scheduleStatus) &&
        timeToMinutes(block.startTime ?? '00:00') <= slotMinutes &&
        timeToMinutes(block.endTime ?? '00:00') > slotMinutes,
    ) ?? null
  );
}

/** True when a slot falls within an in-progress move/resize gesture's prospective range. */
export function isSlotInGesturePreview(
  preview: { stageZoneId: string; startTime: string; endTime: string } | null,
  stageZoneId: string,
  slotTime: string,
): boolean {
  if (!preview || preview.stageZoneId !== stageZoneId) {
    return false;
  }
  const slotMinutes = timeToMinutes(slotTime);
  return (
    slotMinutes >= timeToMinutes(preview.startTime) && slotMinutes < timeToMinutes(preview.endTime)
  );
}

export type BlockCardDensity = 'compact' | 'short' | 'full';

/**
 * How much of a block card's secondary detail can be shown at its rendered height. A
 * one-slot block has room for the act name and nothing else, so the name always wins over
 * times, status, and badges as the card shrinks.
 */
export function blockCardDensity(startTime: string, endTime: string): BlockCardDensity {
  const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (duration <= TIMELINE_SLOT_MINUTES) {
    return 'compact';
  }
  if (duration <= TIMELINE_SLOT_MINUTES * 2) {
    return 'short';
  }
  return 'full';
}
