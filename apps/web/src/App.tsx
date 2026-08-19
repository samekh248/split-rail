import type { ReactNode } from 'react';
import { BookingCalendarPage } from '@/pages/BookingCalendarPage';
import { DashboardOverviewPage } from '@/pages/DashboardOverviewPage';
import { AccountingOverviewPage } from '@/pages/AccountingOverviewPage';
import { EventWorkspacePage } from '@/pages/EventWorkspacePage';
import { BlockSettlementPage } from '@/pages/BlockSettlementPage';
import { FestivalItineraryRoute } from '@/pages/FestivalItineraryRoute';
import { FestivalLedgerPage } from '@/pages/FestivalLedgerPage';
import { FestivalReportsPage } from '@/pages/FestivalReportsPage';
import { VenuesPage } from '@/pages/VenuesPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsLandingPage } from '@/pages/SettingsLandingPage';
import { AccountSettingsPage } from '@/pages/AccountSettingsPage';
import { PlaceholderSettingsPage } from '@/pages/PlaceholderSettingsPage';
import { IntegrationsSettingsRoute } from '@/pages/IntegrationsSettingsRoute';
import { TeamSettingsPage } from '@/pages/TeamSettingsPage';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { OrganizationCreateStep } from '@/components/onboarding/OrganizationCreateStep';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { DateDisplayFormatSync } from '@/components/preferences/DateDisplayFormatSync';
import { AppShell } from '@/components/shell/AppShell';
import { useAuth } from '@/auth/useAuth';
import { VenueProvider } from '@/venue/VenueContext';
import { parseEventWorkspacePath, parseFestivalItineraryPath, parseFestivalLedgerPath, parseFestivalReportsPath, parseBlockSettlementPath, useAppRoute } from '@/lib/appRoute';

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
      <DateDisplayFormatSync />
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

  if (appPath === '/settings/account') {
    return (
      <AuthenticatedShell sidebarNavigation="settings">
        <AccountSettingsPage />
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
        <IntegrationsSettingsRoute />
      </AuthenticatedShell>
    );
  }

  const workspaceRoute =
    typeof appPath === 'string' ? parseEventWorkspacePath(appPath) : null;
  const festivalItineraryRoute =
    typeof appPath === 'string' ? parseFestivalItineraryPath(appPath) : null;
  const festivalLedgerRoute =
    typeof appPath === 'string' ? parseFestivalLedgerPath(appPath) : null;
  const festivalReportsRoute =
    typeof appPath === 'string' ? parseFestivalReportsPath(appPath) : null;
  const blockSettlementRoute =
    typeof appPath === 'string' ? parseBlockSettlementPath(appPath) : null;

  return (
    <>
      <AuthenticatedShell>
        {blockSettlementRoute ? (
          <BlockSettlementPage
            venueId={blockSettlementRoute.venueId}
            eventId={blockSettlementRoute.eventId}
            blockId={blockSettlementRoute.blockId}
          />
        ) : festivalReportsRoute ? (
          <FestivalReportsPage
            venueId={festivalReportsRoute.venueId}
            eventId={festivalReportsRoute.eventId}
          />
        ) : festivalLedgerRoute ? (
          <FestivalLedgerPage
            venueId={festivalLedgerRoute.venueId}
            eventId={festivalLedgerRoute.eventId}
          />
        ) : festivalItineraryRoute ? (
          <FestivalItineraryRoute
            venueId={festivalItineraryRoute.venueId}
            eventId={festivalItineraryRoute.eventId}
          />
        ) : workspaceRoute ? (
          <EventWorkspacePage />
        ) : appPath === '/venues' ? (
          <VenuesPage />
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
