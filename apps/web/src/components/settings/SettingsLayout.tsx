import type { ReactNode } from 'react';
import { navigateToDashboard } from '@/lib/appRoute';
import { SettingsNav } from './SettingsNav';

export interface SettingsLayoutProps {
  title: string;
  children: ReactNode;
}

export function SettingsLayout({ title, children }: SettingsLayoutProps) {
  return (
    <div className="settings-layout">
      <header className="settings-layout__header">
        <button
          type="button"
          className="settings-layout__back"
          onClick={() => navigateToDashboard()}
        >
          ← Back to dashboard
        </button>
        <h1 className="settings-layout__title">{title}</h1>
      </header>
      <div className="settings-layout__body">
        <SettingsNav />
        <main className="settings-layout__content">{children}</main>
      </div>
    </div>
  );
}
