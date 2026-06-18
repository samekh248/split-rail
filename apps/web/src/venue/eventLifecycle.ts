import type { EventResponse, EventStatus } from '@/types/generated-api';

export type EventLifecyclePhase =
  | 'planning-unlocked'
  | 'planning-locked'
  | 'settled'
  | 'reconciled'
  | 'unknown';

type LifecycleInput = Pick<EventResponse, 'status' | 'isBudgetLocked'>;

export function resolveLifecyclePhase(
  status: EventStatus | string | null | undefined,
  isBudgetLocked?: boolean,
): EventLifecyclePhase {
  if (status === 'PRE_SHOW') {
    return isBudgetLocked ? 'planning-locked' : 'planning-unlocked';
  }
  if (status === 'SETTLED') {
    return 'settled';
  }
  if (status === 'RECONCILED') {
    return 'reconciled';
  }
  return 'unknown';
}

export function isPreShow(status: EventStatus | string | null | undefined): boolean {
  return status === 'PRE_SHOW';
}

export function canEditEventMetadata(
  statusOrEvent: EventStatus | string | null | undefined | LifecycleInput,
  _isBudgetLocked?: boolean,
): boolean {
  const status = typeof statusOrEvent === 'object' && statusOrEvent !== null
    ? statusOrEvent.status
    : statusOrEvent;
  return status === 'PRE_SHOW';
}

export function canDeleteEvent(
  statusOrEvent: EventStatus | string | null | undefined | LifecycleInput,
  isBudgetLocked?: boolean,
): boolean {
  const status = typeof statusOrEvent === 'object' && statusOrEvent !== null
    ? statusOrEvent.status
    : statusOrEvent;
  const locked = typeof statusOrEvent === 'object' && statusOrEvent !== null
    ? statusOrEvent.isBudgetLocked
    : isBudgetLocked;
  return status === 'PRE_SHOW' && !locked;
}

export function isEventFullyLocked(
  status: EventStatus | string | null | undefined,
  _isBudgetLocked?: boolean,
): boolean {
  return status === 'SETTLED' || status === 'RECONCILED';
}
