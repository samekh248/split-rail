import { useVenueSync } from '@/api/qbo';
import { dashboardQueryKey } from '@/api/dashboard';
import { useCanTriggerQboSync } from '@/api/user';
import { useQueryClient } from '@tanstack/react-query';
import { qboKeys } from '@/api/qbo';
import { useState } from 'react';

interface SyncAllButtonProps {
  venueId: string;
}

export function SyncAllButton({ venueId }: SyncAllButtonProps) {
  const canSync = useCanTriggerQboSync();
  const venueSync = useVenueSync(venueId);
  const queryClient = useQueryClient();
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!canSync) {
    return null;
  }

  const handleSync = async () => {
    setResultMessage(null);
    try {
      const result = await venueSync.mutateAsync();
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(venueId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.venueStatus(venueId) });

      const failures = (result.results ?? []).filter((entry) => !entry.success);
      if (failures.length > 0) {
        const titles = failures.map((entry) => entry.title ?? 'Event').join(', ');
        setResultMessage(`Sync completed with failures: ${titles}`);
      } else {
        setResultMessage('All events synced successfully.');
      }
    } catch {
      setResultMessage('Unable to sync events. Please try again.');
    }
  };

  return (
    <div className="sync-all-button-wrap">
      <button
        type="button"
        className="sync-all-button"
        data-testid="sync-all-button"
        disabled={venueSync.isPending}
        onClick={() => void handleSync()}
      >
        {venueSync.isPending ? 'Syncing…' : 'Sync all'}
      </button>
      {resultMessage ? (
        <p className="sync-all-button__result" data-testid="sync-all-result" role="status">
          {resultMessage}
        </p>
      ) : null}
    </div>
  );
}
