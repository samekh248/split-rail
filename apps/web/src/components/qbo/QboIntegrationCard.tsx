import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faRotate, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { LoadingPlaceholder } from '@/components/shell/LoadingPlaceholder';
import {
  fetchQboConnectUrl,
  useQboDisconnect,
  useVenueQboIntegration,
  useVenueSync,
  type VenueQboIntegrationDto,
} from '@/api/qbo';
import { QboDisconnectModal } from '@/components/qbo/QboDisconnectModal';
import { QboPurgeCacheModal } from '@/components/qbo/QboPurgeCacheModal';
import { parseQboConnectionState } from '@/lib/qboConnectionState';

export interface QboIntegrationCardProps {
  venueId: string;
}

function formatSyncedAt(value: string | null | undefined): string {
  if (!value) return 'Never synced';
  return new Date(value).toLocaleString();
}

export function QboIntegrationCard({ venueId }: QboIntegrationCardProps) {
  const integrationQuery = useVenueQboIntegration(venueId);
  const disconnectMutation = useQboDisconnect(venueId);
  const syncMutation = useVenueSync(venueId);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [connectPending, setConnectPending] = useState(false);

  if (integrationQuery.isLoading) {
    return (
      <LoadingPlaceholder
        variant="zone"
        label="Loading QuickBooks integration"
        data-testid="qbo-integration-loading"
      />
    );
  }

  const integration = integrationQuery.data;
  const state = parseQboConnectionState(integration?.connectionState);

  const handleConnect = async () => {
    setConnectPending(true);
    try {
      const authUrl = await fetchQboConnectUrl(venueId);
      window.location.assign(authUrl);
    } finally {
      setConnectPending(false);
    }
  };

  const handleForcePull = () => {
    syncMutation.mutate();
  };

  return (
    <section className="qbo-integration-card" data-testid="qbo-integration-card">
      <header className="qbo-integration-card__header">
        <h2 className="qbo-integration-card__title">QuickBooks Online</h2>
        <StateBadge state={state} />
      </header>

      <p className="qbo-integration-card__explainer">
        Split-Rail pulls cleared banking records from QuickBooks in read-only mode to power
        variance auditing. Your live QuickBooks books are never modified.
      </p>

      {state === 'Connected' && integration && (
        <dl className="qbo-integration-card__meta" data-testid="qbo-integration-connected-meta">
          <div>
            <dt>Company</dt>
            <dd>{integration.companyName ?? '—'}</dd>
          </div>
          <div>
            <dt>Realm ID</dt>
            <dd>{integration.realmId ?? '—'}</dd>
          </div>
          <div>
            <dt>Last sync</dt>
            <dd>{formatSyncedAt(integration.lastSyncedAt)}</dd>
          </div>
        </dl>
      )}

      {state === 'Expired' && (
        <p className="qbo-integration-card__expired" data-testid="qbo-integration-expired-message">
          Your QuickBooks authorization expired. Reconnect to resume syncing.
        </p>
      )}

      <div className="qbo-integration-card__actions">
        {(state === 'Disconnected' || state === 'Expired') && (
          <button
            type="button"
            className="btn-primary qbo-integration-card__connect"
            data-testid="qbo-connect-button"
            disabled={connectPending}
            onClick={() => void handleConnect()}
          >
            <FontAwesomeIcon icon={faLink} aria-hidden="true" />
            {state === 'Expired' ? 'Reconnect to QuickBooks' : 'Connect to QuickBooks'}
          </button>
        )}

        {state === 'Connected' && (
          <>
            <button
              type="button"
              className="btn-secondary qbo-integration-card__force-pull"
              data-testid="qbo-force-pull-button"
              disabled={syncMutation.isPending}
              onClick={handleForcePull}
            >
              <FontAwesomeIcon
                icon={faRotate}
                spin={syncMutation.isPending}
                aria-hidden="true"
              />
              Force Pull Latest QBO Data
            </button>
            <button
              type="button"
              className="btn-outline qbo-integration-card__disconnect"
              data-testid="qbo-disconnect-button"
              onClick={() => setShowDisconnect(true)}
            >
              Disconnect Account
            </button>
          </>
        )}

        {state === 'Disconnected' && integration?.canPurgeCache && (
          <button
            type="button"
            className="btn-outline qbo-integration-card__purge"
            data-testid="qbo-purge-button"
            onClick={() => setShowPurge(true)}
          >
            Clear Cached QBO Data
          </button>
        )}
      </div>

      {showDisconnect && (
        <QboDisconnectModal
          pending={disconnectMutation.isPending}
          onCancel={() => setShowDisconnect(false)}
          onConfirm={() => {
            disconnectMutation.mutate(undefined, {
              onSuccess: () => setShowDisconnect(false),
            });
          }}
        />
      )}

      {showPurge && (
        <QboPurgeCacheModal
          venueId={venueId}
          onCancel={() => setShowPurge(false)}
          onSuccess={() => setShowPurge(false)}
        />
      )}
    </section>
  );
}

function StateBadge({ state }: { state: ReturnType<typeof parseQboConnectionState> }) {
  if (state === 'Connected') {
    return (
      <span className="qbo-integration-card__badge qbo-integration-card__badge--connected">
        Connected
      </span>
    );
  }
  if (state === 'Expired') {
    return (
      <span
        className="qbo-integration-card__badge qbo-integration-card__badge--expired"
        data-testid="qbo-integration-expired-badge"
      >
        <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" /> Connection Expired
      </span>
    );
  }
  return (
    <span className="qbo-integration-card__badge qbo-integration-card__badge--disconnected">
      Disconnected
    </span>
  );
}

export function integrationStateForTest(integration: VenueQboIntegrationDto | undefined) {
  return parseQboConnectionState(integration?.connectionState);
}
