import type { ReactNode } from 'react';
import { BookingCalendarPage } from '@/pages/BookingCalendarPage';
import { DashboardOverviewPage } from '@/pages/DashboardOverviewPage';
import { AccountingOverviewPage } from '@/pages/AccountingOverviewPage';
import { EventWorkspacePage } from '@/pages/EventWorkspacePage';
import { VenuesPage } from '@/pages/VenuesPage';
import { CreateVenuePage } from '@/pages/CreateVenuePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsLandingPage } from '@/pages/SettingsLandingPage';
import { PlaceholderSettingsPage } from '@/pages/PlaceholderSettingsPage';
import { TeamSettingsPage } from '@/pages/TeamSettingsPage';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { OrganizationCreateStep } from '@/components/onboarding/OrganizationCreateStep';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { AppShell } from '@/components/shell/AppShell';
import { useAuth } from '@/auth/useAuth';
import { VenueProvider } from '@/venue/VenueContext';
import { parseEventWorkspacePath, useAppRoute } from '@/lib/appRoute';

function AuthenticatedShell({
  sidebarNavigation = 'global',
  topBarContent,
  children,
}: {
  sidebarNavigation?: 'global' | 'settings';
  topBarContent?: ReactNode;
  children: ReactNode;
}) {
  return (
    <VenueProvider>
      <AppShell sidebarNavigation={sidebarNavigation} topBarContent={topBarContent}>
        {children}
      </AppShell>
    </VenueProvider>
  );
}

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
      <AuthenticatedShell sidebarNavigation="settings">
        <SettingsLandingPage />
      </AuthenticatedShell>
    );
  }

  if (appPath === '/settings/team') {
    return (
      <AuthenticatedShell sidebarNavigation="settings">
        <TeamSettingsPage />
      </AuthenticatedShell>
    );
  }

  if (appPath === '/settings/organization') {
    return (
      <AuthenticatedShell sidebarNavigation="settings">
        <PlaceholderSettingsPage title="Organization" />
      </AuthenticatedShell>
    );
  }

  if (appPath === '/settings/integrations') {
    return (
      <AuthenticatedShell sidebarNavigation="settings">
        <PlaceholderSettingsPage title="Integrations" />
      </AuthenticatedShell>
    );
  }

  const workspaceRoute =
    typeof appPath === 'string' ? parseEventWorkspacePath(appPath) : null;

  return (
    <>
      <AuthenticatedShell>
        {workspaceRoute ? (
          <EventWorkspacePage />
        ) : appPath === '/venues' ? (
          <VenuesPage />
        ) : appPath === '/venues/new' ? (
          <CreateVenuePage />
        ) : appPath === '/accounting' ? (
          <AccountingOverviewPage />
        ) : appPath === '/booking' ? (
          <BookingCalendarPage />
        ) : (
          <DashboardOverviewPage />
        )}
      </AuthenticatedShell>
      {justOnboarded ? (
        <WelcomeModal organizationName={organizationName} onDismiss={dismissWelcome} />
      ) : null}
    </>
  );
}
