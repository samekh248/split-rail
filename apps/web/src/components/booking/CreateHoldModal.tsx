import { useEffect, useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { SelectField } from '@/components/auth/SelectField';
import { useCreateEvent } from '@/api/events';
import type { VenueResponse } from '@/types/generated-api';

export interface CreateHoldModalProps {
  open: boolean;
  venues: VenueResponse[];
  defaultVenueId?: string | null;
  defaultDate?: string | null;
  onClose: () => void;
  onCreated: (eventDate: string) => void;
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

  useEffect(() => {
    if (!open) {
      return;
    }
    setVenueId(defaultVenueId ?? venues[0]?.id ?? '');
    setEventDate(defaultDate ?? '');
    setTitle('');
    setTier('auto');
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
        bookingPlacementStatus: tier === 'auto' ? 'HOLD_1' : tier,
      });
      onCreated(eventDate);
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
        <SelectField
          id="booking-hold-venue"
          label="Venue"
          value={venueId}
          options={venues.map((venue) => ({
            value: venue.id ?? '',
            label: venue.name ?? 'Unnamed venue',
          }))}
          onChange={setVenueId}
        />
        <FormField label="Date" id="booking-hold-date" type="date" value={eventDate} onChange={setEventDate} />
        <FormField label="Act name" id="booking-hold-title" type="text" value={title} onChange={setTitle} />
        <SelectField
          id="booking-hold-tier"
          label="Tier"
          value={tier}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'HOLD_1', label: 'Hold 1' },
            { value: 'HOLD_2', label: 'Hold 2' },
          ]}
          onChange={(value) => setTier(value as typeof tier)}
        />
        {error ? <p role="alert">{error}</p> : null}
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
