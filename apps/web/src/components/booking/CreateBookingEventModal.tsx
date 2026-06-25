import { useEffect, useRef, useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { SelectField } from '@/components/auth/SelectField';
import { ModalHeader } from '@/components/shell/ModalHeader';
import { useCreateEvent } from '@/api/events';
import type { VenueResponse } from '@/types/generated-api';

export interface CreateBookingEventModalProps {
  open: boolean;
  venues: VenueResponse[];
  defaultVenueId?: string | null;
  defaultDate?: string | null;
  onClose: () => void;
  onCreated: (eventDate: string) => void;
}

export function CreateBookingEventModal({
  open,
  venues,
  defaultVenueId,
  defaultDate,
  onClose,
  onCreated,
}: CreateBookingEventModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [venueId, setVenueId] = useState(defaultVenueId ?? venues[0]?.id ?? '');
  const [eventDate, setEventDate] = useState(defaultDate ?? '');
  const [title, setTitle] = useState('');
  const [doorsTime, setDoorsTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createEvent = useCreateEvent(venueId || null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setVenueId(defaultVenueId ?? venues[0]?.id ?? '');
    setEventDate(defaultDate ?? '');
    setTitle('');
    setDoorsTime('');
    setError(null);
  }, [open, defaultVenueId, defaultDate, venues]);

  useEffect(() => {
    if (!open) {
      return;
    }

    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createEvent.mutateAsync({
        title,
        eventDate,
        qboTagName: null,
        bookingPlacementStatus: 'CONFIRMED',
        doorsTime: doorsTime || null,
      });
      onCreated(eventDate);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to create event.';
      setError(message.includes('409') ? 'Booking conflict on the selected date.' : message);
    }
  };

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal booking-create-event-modal"
        data-testid="booking-create-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-event-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <form className="booking-create-modal__form" onSubmit={handleSubmit}>
          <ModalHeader
            title="Create confirmed event"
            titleId="booking-event-modal-title"
            onClose={onClose}
            closeTestId="booking-create-event-close"
          />
          <SelectField
            id="booking-event-venue"
            label="Venue"
            value={venueId}
            options={venues.map((venue) => ({
              value: venue.id ?? '',
              label: venue.name ?? 'Unnamed venue',
            }))}
            onChange={setVenueId}
          />
          <FormField label="Date" id="booking-event-date" type="date" value={eventDate} onChange={setEventDate} />
          <FormField label="Title" id="booking-event-title" type="text" value={title} onChange={setTitle} />
          <FormField label="Doors time" id="booking-event-doors" type="time" value={doorsTime} onChange={setDoorsTime} />
          {error ? (
            <p className="team-modal__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="team-modal__actions booking-create-modal__actions">
            <button type="submit" className="team-modal__save">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
