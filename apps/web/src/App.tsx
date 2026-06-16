import { DashboardHome } from '@/pages/DashboardHome';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OrganizationCreateStep } from '@/components/onboarding/OrganizationCreateStep';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { useAuth } from '@/auth/useAuth';
import { VenueProvider } from '@/venue/VenueContext';

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

  if (phase === 'resolving') {
    return (
      <div className="auth-resolving" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (phase === 'unauthenticated') {
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

  return (
    <>
      <VenueProvider>
        <DashboardHome organizationName={organizationName} />
      </VenueProvider>
      {justOnboarded ? (
        <WelcomeModal organizationName={organizationName} onDismiss={dismissWelcome} />
      ) : null}
    </>
  );
}
