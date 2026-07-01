import { useState } from 'react';
import { QboAccountMappingTable } from '@/components/qbo/QboAccountMappingTable';
import { QboTrackingMappingTable } from '@/components/qbo/QboTrackingMappingTable';

export interface QboMappingConsoleProps {
  venueId: string;
}

type MappingTab = 'tracking' | 'accounts';

export function QboMappingConsole({ venueId }: QboMappingConsoleProps) {
  const [tab, setTab] = useState<MappingTab>('tracking');

  return (
    <section className="qbo-mapping-console" data-testid="qbo-mapping-console">
      <header className="qbo-mapping-console__header">
        <h2 className="qbo-mapping-console__title">Mapping console</h2>
        <div className="qbo-mapping-console__tabs" role="tablist" aria-label="Mapping tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tracking'}
            className={tab === 'tracking' ? 'qbo-mapping-console__tab--active' : undefined}
            data-testid="qbo-mapping-tab-tracking"
            onClick={() => setTab('tracking')}
          >
            Tracking mappings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'accounts'}
            className={tab === 'accounts' ? 'qbo-mapping-console__tab--active' : undefined}
            data-testid="qbo-mapping-tab-accounts"
            onClick={() => setTab('accounts')}
          >
            Account mappings
          </button>
        </div>
      </header>

      {tab === 'tracking' ? (
        <QboTrackingMappingTable venueId={venueId} />
      ) : (
        <QboAccountMappingTable venueId={venueId} />
      )}
    </section>
  );
}
