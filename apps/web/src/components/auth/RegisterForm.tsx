import { useState } from 'react';
import { FormField } from './FormField';
import {
  validateEmail,
  validateOrganizationName,
  validatePassword,
} from '@/auth/validation';
import type { RegisterValues } from '@/auth/AuthContext';

export interface RegisterFormProps {
  onSubmit: (values: RegisterValues) => Promise<void>;
  pending?: boolean;
  formError?: string | null;
  needsOrgRetry?: boolean;
}

export function RegisterForm({
  onSubmit,
  pending = false,
  formError,
  needsOrgRetry = false,
}: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    organizationName?: string;
  }>({});

  const validate = () => {
    const next = {
      email: needsOrgRetry ? undefined : validateEmail(email),
      password: needsOrgRetry ? undefined : validatePassword(password),
      organizationName: validateOrganizationName(organizationName),
    };
    setErrors(next);
    return !next.email && !next.password && !next.organizationName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ email, password, organizationName });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className="auth-form__error" role="alert">
          {formError}
        </p>
      ) : null}
      {!needsOrgRetry ? (
        <>
          <FormField
            id="register-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => setErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
            error={errors.email}
            required
            autoComplete="email"
            disabled={pending}
          />
          <FormField
            id="register-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            onBlur={() =>
              setErrors((prev) => ({ ...prev, password: validatePassword(password) }))
            }
            error={errors.password}
            required
            autoComplete="new-password"
            disabled={pending}
          />
        </>
      ) : null}
      <FormField
        id="register-organization"
        label="Organization name"
        type="text"
        value={organizationName}
        onChange={setOrganizationName}
        onBlur={() =>
          setErrors((prev) => ({
            ...prev,
            organizationName: validateOrganizationName(organizationName),
          }))
        }
        error={errors.organizationName}
        required
        autoComplete="organization"
        disabled={pending}
      />
      <button type="submit" className="auth-form__submit" disabled={pending}>
        {pending ? 'Creating account…' : needsOrgRetry ? 'Retry organization setup' : 'Create account'}
      </button>
    </form>
  );
}
