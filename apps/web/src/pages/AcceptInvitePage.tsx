import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormField } from '@/components/auth/FormField';
import { useAuth } from '@/auth/useAuth';
import { validateEmail, validatePassword } from '@/auth/validation';
import { getInviteTokenFromUrl } from '@/lib/appRoute';
import { mapAuthError } from '@/auth/authApi';

const INVALID_INVITE_MESSAGE =
  'This invitation link is no longer valid. Contact your administrator to request a new invitation.';

export function AcceptInvitePage() {
  const token = getInviteTokenFromUrl();
  const { phase, profile, login, completeAcceptInvitation, logout, pending, error } = useAuth();

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [emailMismatch, setEmailMismatch] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="Invalid invitation link">
        <p role="alert">{INVALID_INVITE_MESSAGE}</p>
      </AuthLayout>
    );
  }

  const isAuthenticated = phase === 'authenticated' && profile;

  const handleInviteError = (err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('409')) {
      if (phase === 'authenticated' && profile) {
        setEmailMismatch(true);
      } else {
        setInviteError(mapAuthError(err));
      }
      return;
    }
    if (
      raw.includes('404') ||
      raw.toLowerCase().includes('invalid') ||
      raw.toLowerCase().includes('expired')
    ) {
      setInvalidToken(true);
      return;
    }
    setInviteError(mapAuthError(err));
  };

  const handleNewUserAccept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) {
      return;
    }

    const errors: Record<string, string> = {};
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      errors.email = emailValidation;
    }
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      errors.password = passwordValidation;
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords must match.';
    }
    setFieldErrors(errors);
    setInviteError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await completeAcceptInvitation({ token, password });
    } catch (err) {
      handleInviteError(err);
    }
  };

  const handleExistingAccept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) {
      return;
    }

    const errors: Record<string, string> = {};
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      errors.email = emailValidation;
    }
    if (!loginPassword) {
      errors.loginPassword = 'Password is required.';
    }
    setFieldErrors(errors);
    setInviteError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await login({ email: email.trim(), password: loginPassword });
      await completeAcceptInvitation({ token });
    } catch (err) {
      handleInviteError(err);
    }
  };

  const handleAuthenticatedAccept = async () => {
    if (pending || !token) {
      return;
    }
    setInviteError(null);
    try {
      await completeAcceptInvitation({ token });
    } catch (err) {
      handleInviteError(err);
    }
  };

  if (invalidToken) {
    return (
      <AuthLayout title="Invitation unavailable">
        <p role="alert">{INVALID_INVITE_MESSAGE}</p>
      </AuthLayout>
    );
  }

  if (isAuthenticated && emailMismatch) {
    return (
      <AuthLayout title="Sign in with invited email">
        <p>
          You are signed in as <strong>{profile?.email}</strong>, but this invitation was sent to a
          different email. Sign out and continue with the invited account.
        </p>
        <button type="button" onClick={() => void logout()}>
          Sign out
        </button>
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    return (
      <AuthLayout title="Accept invitation">
        <p>
          Signed in as <strong>{profile.email}</strong>. Accept to join the organization.
        </p>
        {inviteError ? (
          <p className="form-field__error" role="alert">
            {inviteError}
          </p>
        ) : null}
        {error ? (
          <p className="form-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          data-testid="accept-invite-submit"
          disabled={pending}
          onClick={() => void handleAuthenticatedAccept()}
        >
          {pending ? 'Accepting…' : 'Accept invitation'}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Accept invitation"
      subtitle="Join your organization on Split Rail"
      footer={
        <p className="auth-layout__nav">
          {mode === 'new' ? (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-layout__link" onClick={() => setMode('existing')}>
                Sign in to accept
              </button>
            </>
          ) : (
            <>
              New to Split Rail?{' '}
              <button type="button" className="auth-layout__link" onClick={() => setMode('new')}>
                Create account
              </button>
            </>
          )}
        </p>
      }
    >
      {inviteError || error ? (
        <p className="form-field__error" role="alert">
          {inviteError ?? error}
        </p>
      ) : null}
      {mode === 'new' ? (
        <form onSubmit={(event) => void handleNewUserAccept(event)}>
          <FormField
            id="accept-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            required
            autoComplete="email"
            disabled={pending}
          />
          <FormField
            id="accept-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            required
            autoComplete="new-password"
            disabled={pending}
          />
          <FormField
            id="accept-confirm-password"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={fieldErrors.confirmPassword}
            required
            autoComplete="new-password"
            disabled={pending}
          />
          <button type="submit" data-testid="accept-invite-submit" disabled={pending}>
            {pending ? 'Accepting…' : 'Accept invitation'}
          </button>
        </form>
      ) : (
        <form onSubmit={(event) => void handleExistingAccept(event)}>
          <FormField
            id="accept-login-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            required
            autoComplete="email"
            disabled={pending}
          />
          <FormField
            id="accept-login-password"
            label="Password"
            type="password"
            value={loginPassword}
            onChange={setLoginPassword}
            error={fieldErrors.loginPassword}
            required
            autoComplete="current-password"
            disabled={pending}
          />
          <button type="submit" data-testid="accept-invite-submit" disabled={pending}>
            {pending ? 'Accepting…' : 'Sign in and accept'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
