import { useEffect, useRef } from 'react';
import { sortAgendaPlacements, type BookingPlacement } from '@/lib/bookingCalendar';
import { placementStatusLabel } from '@/components/booking/BookingCalendarMatrix';
import { ModalHeader } from '@/components/shell/ModalHeader';

export interface BookingDailyAgendaDrawerProps {
  open: boolean;
  dateKey: string | null;
  placements: BookingPlacement[];
  onClose: () => void;
  onPlacementClick: (placement: BookingPlacement) => void;
}

export function BookingDailyAgendaDrawer({
  open,
  dateKey,
  placements,
  onClose,
  onPlacementClick,
}: BookingDailyAgendaDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !dateKey) {
    return null;
  }

  const sorted = sortAgendaPlacements(placements);

  return (
    <div
      className="booking-daily-agenda"
      data-testid="booking-daily-agenda"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-daily-agenda-title"
      ref={dialogRef}
      tabIndex={-1}
    >
      <ModalHeader
        title={dateKey}
        titleId="booking-daily-agenda-title"
        onClose={onClose}
        closeTestId="booking-daily-agenda-close"
      />
      <ul>
        {sorted.map((placement) => (
          <li key={placement.eventId}>
            <button type="button" onClick={() => onPlacementClick(placement)}>
              <span>{placement.venueName}</span>
              <span>{placement.doorsTime ?? 'Time TBD'}</span>
              <span>{placement.title}</span>
              <span>{placementStatusLabel(placement.bookingPlacementStatus)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
