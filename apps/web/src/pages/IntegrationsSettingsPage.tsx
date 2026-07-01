import { useEffect, useMemo, useState } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { QboIntegrationCard } from '@/components/qbo/QboIntegrationCard';
import { QboMappingConsole } from '@/components/qbo/QboMappingConsole';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';
import { replacePath } from '@/lib/appRoute';
import { useVenueQboIntegration } from '@/api/qbo';
import { parseQboConnectionState } from '@/lib/qboConnectionState';
import { useActiveVenue } from '@/venue/useActiveVenue';

export function IntegrationsSettingsPage() {
  const { venues, isLoading, activateVenueId } = useActiveVenue();
  const [showConnectedToast, setShowConnectedToast] = useState(false);
  const [oauthVenueId, setOauthVenueId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qboJustConnected = params.get('qboConnected') === 'true';
    const queryVenueId = params.get('venueId');

    if (queryVenueId) {
      activateVenueId(queryVenueId);
      setOauthVenueId(queryVenueId);
    }

    if (qboJustConnected) {
      setShowConnectedToast(true);
    }

    if (qboJustConnected || queryVenueId) {
      params.delete('qboConnected');
      params.delete('venueId');
      const query = params.toString();
      replacePath(query ? `/settings/integrations?${query}` : '/settings/integrations');
    }
  }, [activateVenueId]);

  const integrationVenueId = useMemo(() => {
    if (oauthVenueId && venues.some((venue) => venue.id === oauthVenueId)) {
      return oauthVenueId;
    }
    return venues[0]?.id ?? '';
  }, [oauthVenueId, venues]);

  const integrationQuery = useVenueQboIntegration(integrationVenueId);
  const connectionState = parseQboConnectionState(integrationQuery.data?.connectionState);
  const showMappingConsole =
    connectionState === 'Connected' || connectionState === 'Expired';

  return (
    <SettingsLayout title="Integrations">
      <p className="settings-landing__intro">
        Connect QuickBooks Online for your organization and manage how Split-Rail maps QBO
        data to events and venues.
      </p>

      {showConnectedToast && (
        <p
          className="team-section__banner team-section__banner--success"
          role="status"
          data-testid="qbo-connected-toast"
        >
          QuickBooks connected successfully.
        </p>
      )}

      {isLoading ? (
        <LoadingPlaceholder
          variant="zone"
          label="Loading venues"
          data-testid="integrations-settings-loading"
        />
      ) : venues.length === 0 ? (
        <p className="team-section__empty" data-testid="integrations-settings-empty">
          No venues available. Create a venue before connecting QuickBooks.
        </p>
      ) : integrationVenueId ? (
        <>
          <QboIntegrationCard venueId={integrationVenueId} />
          {showMappingConsole && <QboMappingConsole venueId={integrationVenueId} />}
        </>
      ) : null}
    </SettingsLayout>
  );
}
