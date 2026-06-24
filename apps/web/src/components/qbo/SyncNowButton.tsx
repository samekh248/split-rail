import { useTriggerSync } from '@/api/qbo';
import { useCanTriggerQboSync } from '@/api/user';
import { useQueryClient } from '@tanstack/react-query';
import { ledgerKeys } from '@/api/ledger';
import { qboKeys } from '@/api/qbo';

interface SyncNowButtonProps {
  venueId: string;
  eventId: string;
}

export function SyncNowButton({ venueId, eventId }: SyncNowButtonProps) {
  const canSync = useCanTriggerQboSync();
  const triggerSync = useTriggerSync(venueId, eventId);
  const queryClient = useQueryClient();

  if (!canSync) return null;

  const handleSync = async () => {
    try {
      await triggerSync.mutateAsync();
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.grid(venueId, eventId) });
      void queryClient.invalidateQueries({ queryKey: qboKeys.unmappedCount(venueId, eventId) });
    } catch {
      /* error surfaced via mutation state */
    }
  };

  return (
    <button
      type="button"
      className="sync-now-button btn-primary--compact"
      data-testid="sync-now-button"
      disabled={triggerSync.isPending}
      onClick={() => void handleSync()}
    >
      {triggerSync.isPending ? 'Syncing…' : 'Sync Now'}
    </button>
  );
}
