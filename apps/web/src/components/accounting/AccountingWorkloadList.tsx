import { navigateToEventWorkspace } from '@/lib/eventWorkspaceRoute';
import type { AccountingWorkloadEvent } from '@/lib/accountingWorkload';

export interface AccountingWorkloadListProps {
  events: AccountingWorkloadEvent[];
}

export function AccountingWorkloadList({ events }: AccountingWorkloadListProps) {
  if (events.length === 0) {
    return (
      <section className="accounting-workload-list accounting-workload-list--empty" data-testid="accounting-workload-list">
        <h2 className="accounting-workload-list__title">Events needing attention</h2>
        <p className="accounting-workload-list__empty">No events need accounting attention right now.</p>
      </section>
    );
  }

  return (
    <section className="accounting-workload-list" data-testid="accounting-workload-list">
      <h2 className="accounting-workload-list__title">Events needing attention</h2>
      <ul className="accounting-workload-list__items">
        {events.map((event) => (
          <li key={event.eventId} className="accounting-workload-list__item">
            <div className="accounting-workload-list__summary">
              <span className="accounting-workload-list__title-text">{event.title}</span>
              <span className="accounting-workload-list__date">{event.eventDate}</span>
              {event.unmappedCount > 0 ? (
                <span className="accounting-workload-list__badge">{event.unmappedCount} unassigned</span>
              ) : null}
            </div>
            {event.alertLabels.length > 0 ? (
              <ul className="accounting-workload-list__alerts">
                {event.alertLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="accounting-workload-list__workspace-link"
              data-testid={`accounting-workload-link-${event.eventId}`}
              onClick={() => navigateToEventWorkspace(event.venueId, event.eventId, 'sync')}
            >
              Open sync workspace
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
