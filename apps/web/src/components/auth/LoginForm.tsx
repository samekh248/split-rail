import { useState } from 'react';
import type { LoginRequest } from '@/types/generated-api';
import { FormField } from './FormField';
import { validateEmail, validatePassword } from '@/auth/validation';

export interface LoginFormProps {
  onSubmit: (credentials: LoginRequest) => Promise<void>;
  pending?: boolean;
  formError?: string | null;
}

export function LoginForm({ onSubmit, pending = false, formError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const next = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    return !next.email && !next.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ email, password });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className="auth-form__error" role="alert">
          {formError}
        </p>
      ) : null}
      <FormField
        id="login-email"
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
        id="login-password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        onBlur={() => setErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
        error={errors.password}
        required
        autoComplete="current-password"
        disabled={pending}
      />
      <button type="submit" className="auth-form__submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
