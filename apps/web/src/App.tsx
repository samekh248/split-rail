import { DashboardHome } from '@/pages/DashboardHome';
import { CreateVenuePage } from '@/pages/CreateVenuePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsLandingPage } from '@/pages/SettingsLandingPage';
import { PlaceholderSettingsPage } from '@/pages/PlaceholderSettingsPage';
import { TeamSettingsPage } from '@/pages/TeamSettingsPage';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { OrganizationCreateStep } from '@/components/onboarding/OrganizationCreateStep';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { useAuth } from '@/auth/useAuth';
import { VenueProvider } from '@/venue/VenueContext';
import { useAppRoute } from '@/lib/appRoute';

export default function App() {
  const {
    phase,
    authView,
    setAuthView,
    profile,
    justOnboarded,
    pending,
    error,
    createOrganization,
    dismissWelcome,
  } = useAuth();
  const appPath = useAppRoute();

  if (phase === 'resolving') {
    return (
      <div className="auth-resolving" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (phase === 'unauthenticated') {
    if (appPath === '/accept-invite') {
      return <AcceptInvitePage />;
    }
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToRegister={() => setAuthView('register')} />;
  }

  if (phase === 'needs-organization') {
    return (
      <OrganizationCreateStep
        onSubmit={createOrganization}
        pending={pending}
        error={error}
      />
    );
  }

  const organizationName = profile?.organization?.name ?? 'Your organization';

  if (appPath === '/accept-invite') {
    return <AcceptInvitePage />;
  }

  if (appPath === '/settings') {
    return (
      <VenueProvider>
        <SettingsLandingPage />
      </VenueProvider>
    );
  }

  if (appPath === '/settings/team') {
    return (
      <VenueProvider>
        <TeamSettingsPage />
      </VenueProvider>
    );
  }

  if (appPath === '/settings/organization') {
    return (
      <VenueProvider>
        <PlaceholderSettingsPage title="Organization" />
      </VenueProvider>
    );
  }

  if (appPath === '/settings/integrations') {
    return (
      <VenueProvider>
        <PlaceholderSettingsPage title="Integrations" />
      </VenueProvider>
    );
  }

  return (
    <>
      <VenueProvider>
        {appPath === '/venues/new' ? (
          <CreateVenuePage />
        ) : (
          <DashboardHome organizationName={organizationName} />
        )}
      </VenueProvider>
      {justOnboarded ? (
        <WelcomeModal organizationName={organizationName} onDismiss={dismissWelcome} />
      ) : null}
    </>
  );
}
