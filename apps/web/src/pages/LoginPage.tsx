import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/auth/useAuth';

export interface LoginPageProps {
  onNavigateToRegister: () => void;
}

export function LoginPage({ onNavigateToRegister }: LoginPageProps) {
  const { login, pending, error } = useAuth();

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your Split Rail workspace"
      footer={
        <p className="auth-layout__nav">
          Don&apos;t have an account?{' '}
          <button type="button" className="auth-layout__link" onClick={onNavigateToRegister}>
            Create an account
          </button>
        </p>
      }
    >
      <LoginForm onSubmit={login} pending={pending} formError={error} />
    </AuthLayout>
  );
}
