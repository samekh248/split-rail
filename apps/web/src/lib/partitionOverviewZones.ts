import { deriveLifecyclePhase } from '@/lib/eventLifecycle';
import { isEventPinned } from '@/lib/pinnedEventStorage';
import type { EventResponse } from '@/types/generated-api';

export interface OverviewZonePartition {
  tonight: EventResponse[];
  pinned: EventResponse[];
  upcoming: EventResponse[];
  recent: EventResponse[];
}

const PHASE_PRIORITY: Record<ReturnType<typeof deriveLifecyclePhase>, number> = {
  NightOf: 0,
  PreShow: 1,
  PostShow: 2,
  Unknown: 3,
};

function parseEventDate(eventDate: string | null | undefined): Date | null {
  if (!eventDate) {
    return null;
  }
  const [year, month, day] = eventDate.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfDay(result);
}

function compareEventDateDesc(a: EventResponse, b: EventResponse): number {
  const dateA = a.eventDate ?? '';
  const dateB = b.eventDate ?? '';
  return dateB.localeCompare(dateA);
}

function compareEventDateAsc(a: EventResponse, b: EventResponse): number {
  const dateA = a.eventDate ?? '';
  const dateB = b.eventDate ?? '';
  return dateA.localeCompare(dateB);
}

function compareTonightPriority(a: EventResponse, b: EventResponse, now: Date): number {
  const phaseA = deriveLifecyclePhase(a, now);
  const phaseB = deriveLifecyclePhase(b, now);
  const priorityDiff = PHASE_PRIORITY[phaseA] - PHASE_PRIORITY[phaseB];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  return compareEventDateAsc(a, b);
}

export function filterTonightEvents(events: EventResponse[], now: Date = new Date()): EventResponse[] {
  const today = startOfDay(now);
  return events
    .filter((event) => {
      const parsed = parseEventDate(event.eventDate);
      return parsed ? isSameCalendarDay(parsed, today) : false;
    })
    .sort((a, b) => compareTonightPriority(a, b, now));
}

export function partitionRecentEvents(events: EventResponse[], now: Date = new Date()): EventResponse[] {
  const today = startOfDay(now);
  const oldest = addCalendarDays(today, -7);
  const yesterday = addCalendarDays(today, -1);

  return events
    .filter((event) => {
      const parsed = parseEventDate(event.eventDate);
      if (!parsed) {
        return false;
      }
      const day = startOfDay(parsed);
      return day >= oldest && day <= yesterday;
    })
    .sort(compareEventDateDesc);
}

export function partitionUpcomingEvents(events: EventResponse[], now: Date = new Date()): EventResponse[] {
  const today = startOfDay(now);
  const tomorrow = addCalendarDays(today, 1);
  const horizon = addCalendarDays(today, 30);

  return events
    .filter((event) => {
      const parsed = parseEventDate(event.eventDate);
      if (!parsed) {
        return false;
      }
      const day = startOfDay(parsed);
      return day >= tomorrow && day <= horizon;
    })
    .sort(compareEventDateAsc);
}

export function getPinnedEvents(events: EventResponse[], venueId: string): EventResponse[] {
  return events
    .filter((event) => event.eventId != null && isEventPinned(venueId, event.eventId))
    .sort(compareEventDateDesc);
}

export function partitionOverviewZones(
  events: EventResponse[],
  venueId: string,
  now: Date = new Date(),
): OverviewZonePartition {
  return {
    tonight: filterTonightEvents(events, now),
    pinned: getPinnedEvents(events, venueId),
    upcoming: partitionUpcomingEvents(events, now),
    recent: partitionRecentEvents(events, now),
  };
}
