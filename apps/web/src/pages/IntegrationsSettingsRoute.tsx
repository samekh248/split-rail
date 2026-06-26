import { useEffect } from 'react';
import { navigateToSettings } from '@/lib/appRoute';
import { IntegrationsSettingsPage } from '@/pages/IntegrationsSettingsPage';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export function IntegrationsSettingsRoute() {
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (!isAdmin) {
      navigateToSettings();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <p role="status" data-testid="integrations-access-denied">
        Integrations settings are available to Admins only.
      </p>
    );
  }

  return <IntegrationsSettingsPage />;
}
