import { EventLedgerPage } from '@/pages/EventLedgerPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { useAuth } from '@/auth/useAuth';

function parseRouteParams(): { venueId: string; eventId: string } {
  const params = new URLSearchParams(window.location.search);
  const venueId = params.get('venueId') ?? '00000000-0000-0000-0000-000000000001';
  const eventId = params.get('eventId') ?? '00000000-0000-0000-0000-000000000002';
  return { venueId, eventId };
}

function Dashboard() {
  const { venueId, eventId } = parseRouteParams();
  const { logout } = useAuth();

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div>
            <h1>Split Rail</h1>
            <p className="app__subtitle">Event Financial Ledger</p>
          </div>
          <button type="button" className="app__logout" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <EventLedgerPage venueId={venueId} eventId={eventId} />
    </div>
  );
}

export default function App() {
  const { phase, authView, setAuthView } = useAuth();

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

  return <Dashboard />;
}
