import { useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { useCreateEvent } from '@/api/events';
import type { VenueResponse } from '@/types/generated-api';

export interface CreateHoldModalProps {
  open: boolean;
  venues: VenueResponse[];
  defaultVenueId?: string | null;
  defaultDate?: string | null;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateHoldModal({
  open,
  venues,
  defaultVenueId,
  defaultDate,
  onClose,
  onCreated,
}: CreateHoldModalProps) {
  const [venueId, setVenueId] = useState(defaultVenueId ?? venues[0]?.id ?? '');
  const [eventDate, setEventDate] = useState(defaultDate ?? '');
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<'HOLD_1' | 'HOLD_2' | 'auto'>('auto');
  const [error, setError] = useState<string | null>(null);
  const createEvent = useCreateEvent(venueId || null);

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
        bookingPlacementStatus: tier === 'auto' ? 'HOLD_1' : tier,
      });
      onCreated();
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to create hold.';
      setError(message.includes('409') ? 'Booking conflict on the selected date.' : message);
    }
  };

  return (
    <div
      className="booking-create-hold-modal"
      data-testid="booking-create-hold-modal"
      role="dialog"
      aria-modal="true"
    >
      <form onSubmit={handleSubmit}>
        <h2>Create hold</h2>
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
        <FormField label="Date" id="booking-hold-date" type="date" value={eventDate} onChange={setEventDate} />
        <FormField label="Act name" id="booking-hold-title" value={title} onChange={setTitle} />
        <label>
          Tier
          <select value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}>
            <option value="auto">Auto</option>
            <option value="HOLD_1">Hold 1</option>
            <option value="HOLD_2">Hold 2</option>
          </select>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
