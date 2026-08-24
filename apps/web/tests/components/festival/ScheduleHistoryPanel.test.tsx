import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleHistoryPanel } from '@/components/festival/ScheduleHistoryPanel';
import type { FestivalAuditEntryResponse } from '@/types/generated-api';

const entries: FestivalAuditEntryResponse[] = [
  {
    id: 'audit-1',
    entityType: 'ProgrammingBlock',
    entityId: 'block-1',
    action: 'Reschedule',
    priorValueJson: JSON.stringify({
      DayDate: '2026-08-14',
      StageZoneId: 'stage-1',
      StartTime: '14:00',
      EndTime: '15:00',
    }),
    newValueJson: JSON.stringify({
      DayDate: '2026-08-14',
      StageZoneId: 'stage-1',
      StartTime: '16:00',
      EndTime: '17:00',
    }),
    userId: 'user-1',
    occurredAt: '2026-08-14T18:00:00Z',
    reason: null,
  },
  {
    id: 'audit-2',
    entityType: 'ProgrammingBlock',
    entityId: 'block-1',
    action: 'StatusChange',
    priorValueJson: JSON.stringify({ Status: 'SCHEDULED' }),
    newValueJson: JSON.stringify({ Status: 'DELAYED' }),
    userId: 'user-1',
    occurredAt: '2026-08-14T19:00:00Z',
    reason: 'Weather delay',
  },
  {
    id: 'audit-3',
    entityType: 'ProgrammingBlock',
    entityId: 'block-1',
    action: 'Moved',
    priorValueJson: JSON.stringify({
      DayDate: '2026-08-14',
      StageZoneId: 'stage-1',
      StartTime: '16:00',
      EndTime: '17:00',
    }),
    newValueJson: JSON.stringify({
      DayDate: '2026-08-14',
      StageZoneId: 'stage-2',
      StartTime: '16:00',
      EndTime: '17:00',
    }),
    userId: 'user-1',
    occurredAt: '2026-08-14T20:00:00Z',
    reason: null,
  },
];

describe('ScheduleHistoryPanel', () => {
  it('renders reschedule and status-change audit entries', () => {
    render(<ScheduleHistoryPanel entries={entries} />);

    expect(screen.getByTestId('schedule-history-panel')).toBeInTheDocument();

    const items = screen.getAllByTestId(/schedule-history-entry-/);
    expect(items.length).toBe(3);

    expect(screen.getByText(/Rescheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/2:00 PM.*4:00 PM/)).toBeInTheDocument();

    expect(screen.getByText(/Status changed/i)).toBeInTheDocument();
    expect(screen.getByText(/SCHEDULED.*DELAYED/i)).toBeInTheDocument();
    expect(screen.getByText(/Weather delay/i)).toBeInTheDocument();

    expect(screen.getByText(/Moved to another stage/i)).toBeInTheDocument();
  });

  it('shows an empty state when there is no history', () => {
    render(<ScheduleHistoryPanel entries={[]} />);

    expect(screen.getByTestId('schedule-history-empty')).toHaveTextContent(/No schedule changes/i);
  });
});
