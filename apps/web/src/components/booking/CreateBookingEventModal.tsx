import { useEffect, useState } from 'react';
import { FormField } from '@/components/auth/FormField';
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
    >
      <form onSubmit={handleSubmit}>
        <h2>Create confirmed event</h2>
        <label>
          Venue
          <select value={venueId} onChange={(event) => setVenueId(event.target.value)}>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id ?? ''}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
        <FormField label="Date" id="booking-event-date" type="date" value={eventDate} onChange={setEventDate} />
        <FormField label="Title" id="booking-event-title" type="text" value={title} onChange={setTitle} />
        <FormField label="Doors time" id="booking-event-doors" type="time" value={doorsTime} onChange={setDoorsTime} />
        {error ? <p role="alert">{error}</p> : null}
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
