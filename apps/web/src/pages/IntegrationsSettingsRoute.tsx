import { useEffect } from 'react';
import { navigateToSettings } from '@/lib/appRoute';
import { IntegrationsSettingsPage } from '@/pages/IntegrationsSettingsPage';
import { useUserProfile } from '@/api/user';

export function IntegrationsSettingsRoute() {
  const { data: profile, isPending } = useUserProfile();
  const isAdmin = profile?.role?.roleName === 'Admin';

  useEffect(() => {
    if (!isPending && !isAdmin) {
      navigateToSettings();
    }
  }, [isPending, isAdmin]);

  if (isPending) {
    return (
      <p role="status" data-testid="integrations-settings-resolving">
        Loading…
      </p>
    );
  }

  if (!isAdmin) {
    return (
      <p role="status" data-testid="integrations-access-denied">
        Integrations settings are available to Admins only.
      </p>
    );
  }

  return <IntegrationsSettingsPage />;
}
