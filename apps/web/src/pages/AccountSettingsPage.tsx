import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SelectField } from '@/components/auth/SelectField';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { useUpdateUserPreferences, useUserProfile } from '@/api/user';
import {
  DATE_DISPLAY_FORMAT_OPTIONS,
  resolveDateDisplayFormat,
  setDateDisplayFormat,
  type DateDisplayFormat,
} from '@/lib/dateDisplayFormat';
import {
  resolveTimeDisplayFormat,
  setTimeDisplayFormat,
  TIME_DISPLAY_FORMAT_OPTIONS,
  type TimeDisplayFormat,
} from '@/lib/timeDisplayFormat';

export function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useUserProfile();
  const updatePreferences = useUpdateUserPreferences();
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateDisplayFormat>(
    resolveDateDisplayFormat(profile?.dateDisplayFormat),
  );
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<TimeDisplayFormat>(
    resolveTimeDisplayFormat(profile?.timeDisplayFormat),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedDateFormat(resolveDateDisplayFormat(profile?.dateDisplayFormat));
  }, [profile?.dateDisplayFormat]);

  useEffect(() => {
    setSelectedTimeFormat(resolveTimeDisplayFormat(profile?.timeDisplayFormat));
  }, [profile?.timeDisplayFormat]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      const updated = await updatePreferences.mutateAsync({
        dateDisplayFormat: selectedDateFormat,
        timeDisplayFormat: selectedTimeFormat,
      });
      setDateDisplayFormat(updated.dateDisplayFormat);
      setTimeDisplayFormat(updated.timeDisplayFormat);
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
          value={selectedDateFormat}
          options={DATE_DISPLAY_FORMAT_OPTIONS.map((option) => ({
            value: option.value,
            label: `${option.label} (${option.example})`,
          }))}
          onChange={(value) => {
            setSelectedDateFormat(resolveDateDisplayFormat(value));
            setSaved(false);
          }}
          disabled={isLoading || updatePreferences.isPending}
          data-testid="account-date-display-format"
        />
        <SelectField
          id="account-time-display-format"
          label="Time display format"
          value={selectedTimeFormat}
          options={TIME_DISPLAY_FORMAT_OPTIONS.map((option) => ({
            value: option.value,
            label: `${option.label} (${option.example})`,
          }))}
          onChange={(value) => {
            setSelectedTimeFormat(resolveTimeDisplayFormat(value));
            setSaved(false);
          }}
          disabled={isLoading || updatePreferences.isPending}
          data-testid="account-time-display-format"
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
