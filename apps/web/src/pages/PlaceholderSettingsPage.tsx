import { SettingsLayout } from '@/components/settings/SettingsLayout';

export interface PlaceholderSettingsPageProps {
  title: string;
}

export function PlaceholderSettingsPage({ title }: PlaceholderSettingsPageProps) {
  return (
    <SettingsLayout title={title}>
      <section className="settings-placeholder" aria-labelledby="settings-placeholder-heading">
        <h2 id="settings-placeholder-heading" className="settings-placeholder__title">
          Coming soon
        </h2>
        <p className="settings-placeholder__text">
          {title} settings are not available yet. Check back in a future release.
        </p>
      </section>
    </SettingsLayout>
  );
}
