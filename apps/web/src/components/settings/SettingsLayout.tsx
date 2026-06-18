import type { ReactNode } from 'react';

export interface SettingsLayoutProps {
  title: string;
  children: ReactNode;
}

export function SettingsLayout({ title, children }: SettingsLayoutProps) {
  return (
    <div className="settings-layout">
      <h1 className="settings-layout__title">{title}</h1>
      <main className="settings-layout__content">{children}</main>
    </div>
  );
}
