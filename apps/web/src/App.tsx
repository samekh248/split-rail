import { EventLedgerPage } from '@/pages/EventLedgerPage';

function parseRouteParams(): { venueId: string; eventId: string } {
  const params = new URLSearchParams(window.location.search);
  const venueId = params.get('venueId') ?? '00000000-0000-0000-0000-000000000001';
  const eventId = params.get('eventId') ?? '00000000-0000-0000-0000-000000000002';
  return { venueId, eventId };
}

export default function App() {
  const { venueId, eventId } = parseRouteParams();

  return (
    <div className="app">
      <header className="app__header">
        <h1>Split Rail</h1>
        <p className="app__subtitle">Event Financial Ledger</p>
      </header>
      <EventLedgerPage venueId={venueId} eventId={eventId} />
    </div>
  );
}
