import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/auth/useAuth';

export interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export function RegisterPage({ onNavigateToLogin }: RegisterPageProps) {
  const { onboard, pending, error } = useAuth();

  return (
    <AuthLayout
      title="Create account"
      subtitle="Register your organization on Split Rail"
      footer={
        <p className="auth-layout__nav">
          Already have an account?{' '}
          <button type="button" className="auth-layout__link" onClick={onNavigateToLogin}>
            Sign in
          </button>
        </p>
      }
    >
      <RegisterForm onSubmit={onboard} pending={pending} formError={error} />
    </AuthLayout>
  );
}
