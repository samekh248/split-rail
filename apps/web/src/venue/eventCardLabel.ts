import type { EventStatus } from '@/types/generated-api';
import { resolveLifecyclePhase } from '@/venue/eventLifecycle';

export function formatStatusBadgeLabel(
  status: EventStatus | string | null | undefined,
  isBudgetLocked?: boolean,
): string {
  switch (resolveLifecyclePhase(status, isBudgetLocked)) {
    case 'planning-unlocked':
      return 'Planning';
    case 'planning-locked':
      return 'Budget locked';
    case 'settled':
      return 'Settled';
    case 'reconciled':
      return 'Reconciled';
    default:
      return 'Unknown';
  }
}

export function resolveEditActionHint(
  status: EventStatus | string | null | undefined,
  isBudgetLocked?: boolean,
): string | null {
  switch (resolveLifecyclePhase(status, isBudgetLocked)) {
    case 'planning-unlocked':
    case 'planning-locked':
      return null;
    case 'settled':
    case 'reconciled':
    case 'unknown':
      return 'Event locked';
    default:
      return 'Event locked';
  }
}

export function resolveDeleteActionHint(
  status: EventStatus | string | null | undefined,
  isBudgetLocked?: boolean,
): string | null {
  switch (resolveLifecyclePhase(status, isBudgetLocked)) {
    case 'planning-unlocked':
      return null;
    case 'planning-locked':
      return 'Budget locked';
    case 'settled':
    case 'reconciled':
    case 'unknown':
      return 'Event locked';
    default:
      return 'Event locked';
  }
}
