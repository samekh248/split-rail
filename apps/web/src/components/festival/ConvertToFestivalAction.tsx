import { useState } from 'react';
import { faBan, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FestivalCancelConfirm } from '@/components/festival/FestivalCancelConfirm';
import { FestivalSetupModal } from '@/components/festival/FestivalSetupModal';
import { KebabMenu, type KebabMenuItem } from '@/components/shell/KebabMenu';
import { useUpdateEvent } from '@/api/events';
import type { EventResponse } from '@/types/generated-api';

export interface ConvertToFestivalActionProps {
  venueId: string;
  event: EventResponse;
  canConvert?: boolean;
  canCancelBooking?: boolean;
}

export function ConvertToFestivalAction({
  venueId,
  event,
  canConvert = true,
  canCancelBooking = false,
}: ConvertToFestivalActionProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const updateEvent = useUpdateEvent(venueId, event.eventId ?? null);

  const items: KebabMenuItem[] = [];
  if (canConvert) {
    items.push({
      label: 'Convert to festival',
      icon: faLayerGroup,
      testId: 'festival-convert-button',
      onSelect: () => setSetupOpen(true),
    });
  }
  if (canCancelBooking) {
    items.push({
      label: 'Cancel booking',
      icon: faBan,
      testId: 'event-workspace-cancel-booking',
      destructive: true,
      onSelect: () => {
        setCancelError(null);
        setCancelOpen(true);
      },
    });
  }

  const handleCancelConfirm = async () => {
    if (!event.eventId) {
      return;
    }
    setCancelError(null);
    try {
      await updateEvent.mutateAsync({
        title: event.title,
        eventDate: event.eventDate,
        qboTagName: event.qboTagName ?? null,
        bookingPlacementStatus: 'CANCELLED',
      });
      setCancelOpen(false);
    } catch (caught) {
      setCancelError(caught instanceof Error ? caught.message : 'Unable to cancel booking.');
    }
  };

  return (
    <>
      <KebabMenu
        ariaLabel="More event actions"
        testId="festival-convert-menu"
        items={items}
      />
      <FestivalSetupModal
        venueId={venueId}
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onCreated={() => setSetupOpen(false)}
        existingEventId={event.eventId}
        initialTitle={event.title ?? ''}
        initialStartDate={event.eventDate ?? ''}
      />
      <FestivalCancelConfirm
        eventTitle={event.title ?? 'Event'}
        open={cancelOpen}
        isPending={updateEvent.isPending}
        error={cancelError}
        description={`Cancel the booking for “${event.title ?? 'this event'}”? The date will stay on the calendar as cancelled.`}
        onCancel={() => {
          if (updateEvent.isPending) {
            return;
          }
          setCancelOpen(false);
        }}
        onConfirm={() => void handleCancelConfirm()}
      />
    </>
  );
}
