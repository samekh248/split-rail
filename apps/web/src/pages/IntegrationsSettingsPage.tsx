import { useEffect, useMemo } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { QboIntegrationCard } from '@/components/qbo/QboIntegrationCard';
import { QboMappingConsole } from '@/components/qbo/QboMappingConsole';
import { useVenueQboIntegration } from '@/api/qbo';
import { parseQboConnectionState } from '@/lib/qboConnectionState';
import { useActiveVenue } from '@/venue/useActiveVenue';

export function IntegrationsSettingsPage() {
  const { venues, activeVenueId, isLoading, activateVenueId } = useActiveVenue();

  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const queryVenueId = searchParams.get('venueId');
  const qboConnected = searchParams.get('qboConnected') === 'true';

  useEffect(() => {
    if (queryVenueId) {
      activateVenueId(queryVenueId);
    }
  }, [queryVenueId, activateVenueId]);

  const selectedVenueId = activeVenueId ?? venues[0]?.id ?? '';
  const showVenueSelector = venues.length > 1;
  const integrationQuery = useVenueQboIntegration(selectedVenueId);
  const connectionState = parseQboConnectionState(integrationQuery.data?.connectionState);
  const showMappingConsole =
    connectionState === 'Connected' || connectionState === 'Expired';

  return (
    <SettingsLayout title="Integrations">
      {qboConnected && (
        <p className="integrations-settings__toast" role="status" data-testid="qbo-connected-toast">
          QuickBooks connected successfully.
        </p>
      )}

      {showVenueSelector && (
        <label className="integrations-settings__venue-select">
          <span>Venue</span>
          <select
            value={selectedVenueId}
            data-testid="integrations-venue-select"
            onChange={(event) => activateVenueId(event.target.value)}
          >
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!isLoading && selectedVenueId ? (
        <>
          <QboIntegrationCard venueId={selectedVenueId} />
          {showMappingConsole && <QboMappingConsole venueId={selectedVenueId} />}
        </>
      ) : (
        <p data-testid="integrations-settings-loading">Loading venues…</p>
      )}
    </SettingsLayout>
  );
}
