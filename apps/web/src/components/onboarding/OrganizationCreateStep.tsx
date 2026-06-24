import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormField } from '@/components/auth/FormField';
import { validateOrganizationName } from '@/auth/validation';

export interface OrganizationCreateStepProps {
  onSubmit: (name: string) => Promise<void>;
  pending?: boolean;
  error?: string | null;
}

export function OrganizationCreateStep({
  onSubmit,
  pending = false,
  error,
}: OrganizationCreateStepProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateOrganizationName(organizationName);
    setFieldError(validationError);
    if (validationError) return;
    await onSubmit(organizationName);
  };

  const errorId = error ? 'org-create-error' : undefined;

  return (
    <AuthLayout
      title="Set up your organization"
      subtitle="Your account is ready — add your organization to continue."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <p id={errorId} className="auth-form__error" role="alert">
            {error}
          </p>
        ) : null}
        <FormField
          id="org-create-name"
          label="Organization name"
          type="text"
          value={organizationName}
          onChange={setOrganizationName}
          onBlur={() =>
            setFieldError(validateOrganizationName(organizationName))
          }
          error={fieldError}
          required
          autoComplete="organization"
          disabled={pending}
          describedBy={errorId}
        />
        <button type="submit" className="auth-form__submit btn-primary" disabled={pending}>
          {pending ? 'Creating organization…' : 'Create organization'}
        </button>
      </form>
    </AuthLayout>
  );
}
