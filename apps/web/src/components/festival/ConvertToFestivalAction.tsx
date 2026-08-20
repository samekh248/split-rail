import { useState } from 'react';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FestivalSetupModal } from '@/components/festival/FestivalSetupModal';
import { KebabMenu } from '@/components/shell/KebabMenu';
import type { EventResponse } from '@/types/generated-api';

export interface ConvertToFestivalActionProps {
  venueId: string;
  event: EventResponse;
}

export function ConvertToFestivalAction({ venueId, event }: ConvertToFestivalActionProps) {
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <>
      <KebabMenu
        ariaLabel="More event actions"
        testId="festival-convert-menu"
        items={[
          {
            label: 'Convert to festival',
            icon: faLayerGroup,
            testId: 'festival-convert-button',
            onSelect: () => setSetupOpen(true),
          },
        ]}
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
    </>
  );
}
