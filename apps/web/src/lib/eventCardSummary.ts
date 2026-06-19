import { deriveBottleneckAlerts, type BottleneckAlert } from '@/lib/eventLifecycle';
import type { EventCardDto } from '@/types/generated-api';

/** Server-summary bottleneck chips for dashboard overview cards. */
export function deriveBottleneckAlertsFromSummary(event: EventCardDto): BottleneckAlert[] {
  const alerts: BottleneckAlert[] = [];

  if ((event.unmappedCount ?? 0) > 0) {
    alerts.push({
      kind: 'UNMAPPED_QBO',
      label: `${event.unmappedCount} unmapped account${event.unmappedCount === 1 ? '' : 's'}`,
    });
  }

  if (event.status === 'SETTLED' && !event.lastSyncedAt) {
    alerts.push({
      kind: 'SETTLED_NOT_SYNCED',
      label: 'Not synced to QBO',
    });
  }

  if (event.hasVarianceConcern) {
    alerts.push({
      kind: 'VARIANCE_REVIEW',
      label: 'Variance review needed',
    });
  }

  return alerts;
}

export function mergeBottleneckAlerts(
  summaryAlerts: BottleneckAlert[],
  fallbackAlerts: BottleneckAlert[],
): BottleneckAlert[] {
  const seen = new Set<string>();
  const merged: BottleneckAlert[] = [];
  for (const alert of [...summaryAlerts, ...fallbackAlerts]) {
    if (seen.has(alert.kind)) {
      continue;
    }
    seen.add(alert.kind);
    merged.push(alert);
  }
  return merged;
}

/** True when merged server + fallback bottleneck rules produce at least one alert. */
export function eventHasBottleneckAlerts(event: EventCardDto): boolean {
  const summaryAlerts = deriveBottleneckAlertsFromSummary(event);
  const merged = mergeBottleneckAlerts(summaryAlerts, deriveBottleneckAlerts(event));
  return merged.length > 0;
}

export function filterRecentEventsByBottleneck(
  events: EventCardDto[],
  filterActive: boolean,
): EventCardDto[] {
  if (!filterActive) {
    return events;
  }
  return events.filter(eventHasBottleneckAlerts);
}
