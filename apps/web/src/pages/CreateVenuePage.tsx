import { useEffect, useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormField } from '@/components/auth/FormField';
import { validateVenueName } from '@/auth/validation';
import { useCreateVenue } from '@/api/venues';
import { useUserProfile } from '@/api/user';
import { useCanManageVenues } from '@/hooks/useCanManageVenues';
import { navigateToDashboard } from '@/lib/dashboardRoute';

function mapCreateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('403')) {
    return 'You do not have permission to add venues.';
  }
  if (message.includes('400')) {
    const detail = message.replace(/^\d+:\s*/, '');
    return detail || 'Please check the venue name and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function CreateVenuePage() {
  const { isLoading: profileLoading } = useUserProfile();
  const canManage = useCanManageVenues();
  const createVenue = useCreateVenue();
  const [venueName, setVenueName] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading) {
      return;
    }
    if (!canManage) {
      navigateToDashboard();
    }
  }, [canManage, profileLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateVenueName(venueName);
    setFieldError(validationError);
    if (validationError) {
      return;
    }

    setSubmitError(null);
    try {
      await createVenue.mutateAsync({ name: venueName.trim() });
      navigateToDashboard();
    } catch (error) {
      setSubmitError(mapCreateError(error));
    }
  };

  const errorId = submitError ? 'venue-create-error' : undefined;

  if (profileLoading || !canManage) {
    return null;
  }

  return (
    <AuthLayout
      title="Add venue"
      subtitle="Create a venue to start managing events and ledgers."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {submitError ? (
          <p id={errorId} className="auth-form__error" role="alert">
            {submitError}
          </p>
        ) : null}
        <FormField
          id="venue-create-name"
          label="Venue name"
          type="text"
          value={venueName}
          onChange={setVenueName}
          onBlur={() => setFieldError(validateVenueName(venueName))}
          error={fieldError}
          required
          autoComplete="organization"
          disabled={createVenue.isPending}
          describedBy={errorId}
        />
        <div className="auth-form__actions">
          <button
            type="button"
            className="auth-form__secondary"
            disabled={createVenue.isPending}
            onClick={() => navigateToDashboard()}
          >
            Cancel
          </button>
          <button type="submit" className="auth-form__submit" disabled={createVenue.isPending}>
            {createVenue.isPending ? 'Creating venue…' : 'Create venue'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
