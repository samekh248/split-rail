import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import {
  navigateToIntegrationsSettings,
  navigateToOrganizationSettings,
  navigateToTeamSettings,
} from '@/lib/appRoute';

export function SettingsLandingPage() {
  const canManageTeam = useCanManageTeam();

  return (
    <SettingsLayout title="Settings">
      <p className="settings-landing__intro">
        Manage your organization preferences and team access.
      </p>
      <div className="settings-landing__cards">
        {canManageTeam ? (
          <button
            type="button"
            className="settings-landing__card"
            data-testid="settings-card-team"
            onClick={() => navigateToTeamSettings()}
          >
            <h2 className="settings-landing__card-title">Team</h2>
            <p className="settings-landing__card-text">
              Invite members, manage roles, and control venue access.
            </p>
          </button>
        ) : null}
        <button
          type="button"
          className="settings-landing__card"
          data-testid="settings-card-organization"
          onClick={() => navigateToOrganizationSettings()}
        >
          <h2 className="settings-landing__card-title">Organization</h2>
          <p className="settings-landing__card-text">Organization profile and billing.</p>
        </button>
        <button
          type="button"
          className="settings-landing__card"
          data-testid="settings-card-integrations"
          onClick={() => navigateToIntegrationsSettings()}
        >
          <h2 className="settings-landing__card-title">Integrations</h2>
          <p className="settings-landing__card-text">Connect external services.</p>
        </button>
      </div>
    </SettingsLayout>
  );
}
