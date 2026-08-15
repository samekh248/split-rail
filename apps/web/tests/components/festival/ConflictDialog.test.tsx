import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConflictDialog } from '@/components/festival/ConflictDialog';
import type { BlockConflictInfo } from '@/components/festival/conflictTypes';

const conflict: BlockConflictInfo = {
  conflictingBlockId: 'block-2',
  conflictingBlockTitle: 'Headliner',
  conflictingStartTime: '20:00',
  conflictingEndTime: '21:30',
  message: "'Headliner' already occupies this stage from 20:00 to 21:30.",
};

const attemptedBlock = {
  id: 'block-1',
  title: 'Opening Act',
  dayDate: '2026-08-14',
  stageZoneId: 'stage-1',
  startTime: '20:00',
  endTime: '21:00',
};

describe('ConflictDialog', () => {
  it('names the conflicting block and offers resolution actions', async () => {
    const onReschedule = vi.fn();
    const onEditExisting = vi.fn();
    const onCancelOrMove = vi.fn();
    const onClose = vi.fn();

    render(
      <ConflictDialog
        open
        attemptedBlock={attemptedBlock}
        conflict={conflict}
        onClose={onClose}
        onReschedule={onReschedule}
        onEditExisting={onEditExisting}
        onCancelOrMove={onCancelOrMove}
      />,
    );

    expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Headliner/i)).toBeInTheDocument();
    expect(screen.getByText(/20:00/)).toBeInTheDocument();
    expect(screen.getByText(/21:30/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Pick a new time/i }));
    expect(onReschedule).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Edit existing block/i }));
    expect(onEditExisting).toHaveBeenCalledWith('block-2');

    await userEvent.click(screen.getByRole('button', { name: /Cancel or move conflicting block/i }));
    expect(onCancelOrMove).toHaveBeenCalledWith('block-2');
  });

  it('does not render when closed', () => {
    render(
      <ConflictDialog
        open={false}
        attemptedBlock={attemptedBlock}
        conflict={conflict}
        onClose={vi.fn()}
        onReschedule={vi.fn()}
        onEditExisting={vi.fn()}
        onCancelOrMove={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('conflict-dialog')).not.toBeInTheDocument();
  });
});
