import { useEffect, useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { SelectField } from '@/components/auth/SelectField';
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
    <div
      className="booking-create-event-modal"
      data-testid="booking-create-event-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-event-modal-title"
    >
      <form className="booking-create-modal__form" onSubmit={handleSubmit}>
        <h2 id="booking-event-modal-title" className="booking-create-modal__title">
          Create confirmed event
        </h2>
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
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="team-modal__save">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
