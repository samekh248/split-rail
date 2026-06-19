import {
  eventHasBottleneckAlerts,
  mergeBottleneckAlerts,
  deriveBottleneckAlertsFromSummary,
} from '@/lib/eventCardSummary';
import { deriveBottleneckAlerts } from '@/lib/eventLifecycle';
import type { DashboardResponse, EventCardDto } from '@/types/generated-api';
import { normalizeDashboardPartitions } from '@/api/dashboard';

export interface AccountingWorkloadEvent {
  eventId: string;
  venueId: string;
  title: string;
  eventDate: string;
  unmappedCount: number;
  lastSyncedAt: string | null;
  alertLabels: string[];
}

function collectDashboardEvents(dashboard: DashboardResponse): EventCardDto[] {
  const partitions = normalizeDashboardPartitions(dashboard);
  return [
    ...partitions.pinnedEvents,
    ...partitions.tonightEvents,
    ...partitions.recentEvents,
    ...partitions.upcomingEvents,
  ];
}

function shouldIncludeInWorkload(event: EventCardDto): boolean {
  return (event.unmappedCount ?? 0) > 0 || eventHasBottleneckAlerts(event);
}

function compareWorkloadEvents(a: EventCardDto, b: EventCardDto): number {
  const unmappedDiff = (b.unmappedCount ?? 0) - (a.unmappedCount ?? 0);
  if (unmappedDiff !== 0) {
    return unmappedDiff;
  }
  return String(a.eventDate).localeCompare(String(b.eventDate));
}

export function deriveAccountingWorkloadEvents(
  dashboard: DashboardResponse | undefined,
): AccountingWorkloadEvent[] {
  if (!dashboard) {
    return [];
  }

  const seen = new Set<string>();
  const events = collectDashboardEvents(dashboard)
    .filter((event) => {
      const id = event.eventId;
      if (!id || seen.has(id) || !shouldIncludeInWorkload(event)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .sort(compareWorkloadEvents);

  return events.map((event) => {
    const summaryAlerts = deriveBottleneckAlertsFromSummary(event);
    const alerts = mergeBottleneckAlerts(summaryAlerts, deriveBottleneckAlerts(event));
    return {
      eventId: event.eventId!,
      venueId: event.venueId!,
      title: event.title ?? 'Untitled event',
      eventDate: event.eventDate ?? '',
      unmappedCount: event.unmappedCount ?? 0,
      lastSyncedAt: event.lastSyncedAt ?? null,
      alertLabels: alerts.map((alert) => alert.label),
    };
  });
}
