import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SelectField } from '@/components/auth/SelectField';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useUpdateUserPreferences, useUserProfile } from '@/api/user';
import {
  DATE_DISPLAY_FORMAT_OPTIONS,
  resolveDateDisplayFormat,
  setDateDisplayFormat,
  type DateDisplayFormat,
} from '@/lib/dateDisplayFormat';

export function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useUserProfile();
  const updatePreferences = useUpdateUserPreferences();
  const [selectedFormat, setSelectedFormat] = useState<DateDisplayFormat>(
    resolveDateDisplayFormat(profile?.dateDisplayFormat),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedFormat(resolveDateDisplayFormat(profile?.dateDisplayFormat));
  }, [profile?.dateDisplayFormat]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      const updated = await updatePreferences.mutateAsync({
        dateDisplayFormat: selectedFormat,
      });
      setDateDisplayFormat(updated.dateDisplayFormat);
      void queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save preferences.');
    }
  };

  return (
    <SettingsLayout title="Account">
      <section className="account-settings" data-testid="account-settings">
        <p className="account-settings__intro">
          Personal preferences apply only to your account.
        </p>
        <SelectField
          id="account-date-display-format"
          label="Date display format"
          value={selectedFormat}
          options={DATE_DISPLAY_FORMAT_OPTIONS.map((option) => ({
            value: option.value,
            label: `${option.label} (${option.example})`,
          }))}
          onChange={(value) => {
            setSelectedFormat(resolveDateDisplayFormat(value));
            setSaved(false);
          }}
          disabled={isLoading || updatePreferences.isPending}
          data-testid="account-date-display-format"
        />
        {error ? (
          <p className="account-settings__error" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="account-settings__saved" role="status">
            Preferences saved.
          </p>
        ) : null}
        <div className="account-settings__actions">
          <button
            type="button"
            className="btn-primary"
            data-testid="account-settings-save"
            onClick={() => void handleSave()}
            disabled={isLoading || updatePreferences.isPending}
          >
            {updatePreferences.isPending ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </section>
    </SettingsLayout>
  );
}
