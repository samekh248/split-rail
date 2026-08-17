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
