import type { EventResponse } from '@/types/generated-api';

export type DashboardLifecyclePhase = 'PreShow' | 'NightOf' | 'PostShow' | 'Unknown';

export type BottleneckAlertKind =
  | 'MISSING_SIGNATURE'
  | 'SETTLED_NOT_SYNCED'
  | 'VARIANCE_REVIEW'
  | 'UNMAPPED_QBO';

export interface BottleneckAlert {
  kind: BottleneckAlertKind;
  label: string;
}

const BOTTLENECK_LABELS: Record<BottleneckAlertKind, string> = {
  MISSING_SIGNATURE: 'Missing signature',
  SETTLED_NOT_SYNCED: 'Not synced to QBO',
  VARIANCE_REVIEW: 'Variance review needed',
  UNMAPPED_QBO: 'Unmapped QBO accounts',
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

function isPastEventDate(eventDate: string | null | undefined, now: Date): boolean {
  const parsed = parseEventDate(eventDate);
  if (!parsed) {
    return false;
  }
  return startOfDay(parsed) < startOfDay(now);
}

/** Dashboard zone phase per TDD §4.1 (SPLR-64). */
export function deriveLifecyclePhase(
  event: EventResponse,
  now: Date = new Date(),
): DashboardLifecyclePhase {
  const status = event.status;
  const locked = event.isBudgetLocked === true;
  const parsedDate = parseEventDate(event.eventDate);
  const isToday = parsedDate ? isSameCalendarDay(parsedDate, now) : false;

  if ((status === 'SETTLED' || status === 'RECONCILED') && isPastEventDate(event.eventDate, now)) {
    return 'PostShow';
  }
  if (isToday || (status === 'PRE_SHOW' && locked)) {
    return 'NightOf';
  }
  if (status === 'PRE_SHOW' && !locked) {
    return 'PreShow';
  }
  return 'Unknown';
}

/** Operational bottleneck chips per TDD §4.2 (client-side approximations). */
export function deriveBottleneckAlerts(event: EventResponse): BottleneckAlert[] {
  const alerts: BottleneckAlert[] = [];

  if (event.status === 'PRE_SHOW' && event.isBudgetLocked && !event.settlementPdfAvailable) {
    alerts.push({ kind: 'MISSING_SIGNATURE', label: BOTTLENECK_LABELS.MISSING_SIGNATURE });
  }
  if (event.status === 'SETTLED' && event.qboTagName) {
    alerts.push({ kind: 'SETTLED_NOT_SYNCED', label: BOTTLENECK_LABELS.SETTLED_NOT_SYNCED });
  }
  if (event.status === 'SETTLED' || event.status === 'RECONCILED') {
    alerts.push({ kind: 'VARIANCE_REVIEW', label: BOTTLENECK_LABELS.VARIANCE_REVIEW });
  }

  return alerts;
}

const PHASE_PRIORITY: Record<DashboardLifecyclePhase, number> = {
  NightOf: 0,
  PreShow: 1,
  PostShow: 2,
  Unknown: 3,
};

/** Priority sort NightOf > PreShow > PostShow for hero selection (SPLR-64). */
export function selectTonightHero(events: EventResponse[], now: Date = new Date()): EventResponse | null {
  if (events.length === 0) {
    return null;
  }

  const sorted = [...events].sort((a, b) => {
    const phaseA = deriveLifecyclePhase(a, now);
    const phaseB = deriveLifecyclePhase(b, now);
    const priorityDiff = PHASE_PRIORITY[phaseA] - PHASE_PRIORITY[phaseB];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    const dateA = a.eventDate ?? '';
    const dateB = b.eventDate ?? '';
    return dateA.localeCompare(dateB);
  });

  return sorted[0] ?? null;
}
