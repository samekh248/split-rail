import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faClock } from '@fortawesome/free-solid-svg-icons';

export interface BookingPlacementTypeModalProps {
  open: boolean;
  dateKey: string | null;
  onClose: () => void;
  onSelectEvent: () => void;
  onSelectHold: () => void;
}

function formatChooserDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function BookingPlacementTypeModal({
  open,
  dateKey,
  onClose,
  onSelectEvent,
  onSelectHold,
}: BookingPlacementTypeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !dateKey) {
    return null;
  }

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal booking-placement-type-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-placement-type-title"
        tabIndex={-1}
        data-testid="booking-placement-type-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="booking-placement-type-title" className="welcome-modal__title">
          Add to calendar
        </h2>
        <p className="team-modal__subtitle">{formatChooserDate(dateKey)}</p>
        <div className="booking-placement-type-modal__options" role="group" aria-label="Placement type">
          <button
            type="button"
            className="booking-placement-type-modal__option"
            data-testid="booking-placement-type-event"
            onClick={onSelectEvent}
          >
            <FontAwesomeIcon icon={faCalendarCheck} className="booking-placement-type-modal__icon" aria-hidden />
            <span className="booking-placement-type-modal__option-title">Confirmed event</span>
            <span className="booking-placement-type-modal__option-description">
              Book a confirmed show on this date
            </span>
          </button>
          <button
            type="button"
            className="booking-placement-type-modal__option"
            data-testid="booking-placement-type-hold"
            onClick={onSelectHold}
          >
            <FontAwesomeIcon icon={faClock} className="booking-placement-type-modal__icon" aria-hidden />
            <span className="booking-placement-type-modal__option-title">Hold</span>
            <span className="booking-placement-type-modal__option-description">
              Reserve this date as a tentative hold
            </span>
          </button>
        </div>
        <div className="team-modal__actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
