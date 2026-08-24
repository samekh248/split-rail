import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faClockRotateLeft,
  faRoute,
  faTrafficLight,
} from '@fortawesome/free-solid-svg-icons';
import type { FestivalAuditEntryResponse } from '@/types/generated-api';
import {
  formatDateTimeWithPreference,
  formatTimeRangeWithPreference,
} from '@/lib/timeDisplayFormat';

export interface ScheduleHistoryPanelProps {
  entries: FestivalAuditEntryResponse[];
  loading?: boolean;
}

interface ParsedAuditValues {
  DayDate?: string;
  StageZoneId?: string;
  StartTime?: string;
  EndTime?: string;
  Status?: string;
}

function parseAuditJson(json: string | null | undefined): ParsedAuditValues {
  if (!json) {
    return {};
  }
  try {
    return JSON.parse(json) as ParsedAuditValues;
  } catch {
    return {};
  }
}

function formatTimestamp(value?: string): string {
  return formatDateTimeWithPreference(value);
}

function describeEntry(entry: FestivalAuditEntryResponse): {
  icon: typeof faRoute;
  label: string;
  detail: string;
} {
  const prior = parseAuditJson(entry.priorValueJson);
  const next = parseAuditJson(entry.newValueJson);

  switch (entry.action) {
    case 'Reschedule':
      return {
        icon: faArrowsRotate,
        label: 'Rescheduled',
        detail: `${formatTimeRangeWithPreference(prior.StartTime, prior.EndTime) || '?'} → ${formatTimeRangeWithPreference(next.StartTime, next.EndTime) || '?'}`,
      };
    case 'Moved':
      return {
        icon: faRoute,
        label: 'Moved to another stage',
        detail: `${formatTimeRangeWithPreference(prior.StartTime, prior.EndTime) || '?'} on prior stage → ${formatTimeRangeWithPreference(next.StartTime, next.EndTime) || '?'} on new stage`,
      };
    case 'StatusChange':
      return {
        icon: faTrafficLight,
        label: 'Status changed',
        detail: `${prior.Status ?? '?'} → ${next.Status ?? '?'}`,
      };
    default:
      return {
        icon: faArrowsRotate,
        label: entry.action ?? 'Change',
        detail: entry.reason ?? '',
      };
  }
}

export function ScheduleHistoryPanel({ entries, loading = false }: ScheduleHistoryPanelProps) {
  if (loading) {
    return (
      <section className="schedule-history" data-testid="schedule-history-panel">
        <h3 className="schedule-history__title">
          <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
          Schedule history
        </h3>
        <p className="schedule-history__loading">Loading schedule history…</p>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="schedule-history" data-testid="schedule-history-panel">
        <h3 className="schedule-history__title">
          <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
          Schedule history
        </h3>
        <p className="schedule-history__empty" data-testid="schedule-history-empty">
          No schedule changes recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="schedule-history" data-testid="schedule-history-panel" aria-label="Schedule history">
      <h3 className="schedule-history__title">
        <FontAwesomeIcon icon={faClockRotateLeft} aria-hidden="true" />
        Schedule history
      </h3>
      <ol className="schedule-history__list">
        {entries.map((entry) => {
          const { icon, label, detail } = describeEntry(entry);
          return (
            <li
              key={entry.id}
              className="schedule-history__item"
              data-testid={`schedule-history-entry-${entry.id}`}
            >
              <span className="schedule-history__icon" aria-hidden="true">
                <FontAwesomeIcon icon={icon} />
              </span>
              <div className="schedule-history__content">
                <span className="schedule-history__label">{label}</span>
                <span className="schedule-history__detail">{detail}</span>
                <time className="schedule-history__time" dateTime={entry.occurredAt}>
                  {formatTimestamp(entry.occurredAt)}
                </time>
                {entry.reason ? (
                  <span className="schedule-history__reason">{entry.reason}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
