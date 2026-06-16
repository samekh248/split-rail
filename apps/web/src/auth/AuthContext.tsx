import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequest } from '@/types/generated-api';
import * as authApi from './authApi';
import { getAccessToken, clearTokens } from './tokenStorage';

export type AuthPhase = 'resolving' | 'unauthenticated' | 'authenticated';
export type AuthView = 'login' | 'register';

export interface RegisterValues {
  email: string;
  password: string;
  organizationName: string;
}

export interface AuthContextValue {
  phase: AuthPhase;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  pending: boolean;
  error: string | null;
  clearError: () => void;
  needsOrgRetry: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (values: RegisterValues) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>('resolving');
  const [authView, setAuthViewState] = useState<AuthView>('login');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsOrgRetry, setNeedsOrgRetry] = useState(false);
  const [orgRetryName, setOrgRetryName] = useState('');
  const [orgRetryCredentials, setOrgRetryCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setPhase(token ? 'authenticated' : 'unauthenticated');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const setAuthView = useCallback((view: AuthView) => {
    setAuthViewState(view);
    setError(null);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setPending(true);
    setError(null);
    try {
      await authApi.login(credentials);
      setPhase('authenticated');
    } catch (err) {
      setError(authApi.mapAuthError(err));
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  const register = useCallback(
    async (values: RegisterValues) => {
      setPending(true);
      setError(null);
      try {
        if (needsOrgRetry) {
          await authApi.createOrganization(values.organizationName || orgRetryName);
          if (orgRetryCredentials) {
            await authApi.login(orgRetryCredentials);
          }
          setNeedsOrgRetry(false);
          setOrgRetryName('');
          setOrgRetryCredentials(null);
          setPhase('authenticated');
          return;
        }

        await authApi.registerUser({ email: values.email, password: values.password });
        await authApi.login({ email: values.email, password: values.password });
        try {
          await authApi.createOrganization(values.organizationName);
          await authApi.login({ email: values.email, password: values.password });
        } catch {
          setNeedsOrgRetry(true);
          setOrgRetryName(values.organizationName);
          setOrgRetryCredentials({ email: values.email, password: values.password });
          setError(
            'Account created, but we couldn\'t set up your organization. Please retry.',
          );
          return;
        }
        setPhase('authenticated');
      } catch (err) {
        if (err instanceof authApi.OrgCreationError) {
          setNeedsOrgRetry(true);
          setOrgRetryName(values.organizationName);
          setOrgRetryCredentials({ email: values.email, password: values.password });
        }
        setError(authApi.mapAuthError(err));
        throw err;
      } finally {
        setPending(false);
      }
    },
    [needsOrgRetry, orgRetryName, orgRetryCredentials],
  );

  const logout = useCallback(async () => {
    setPending(true);
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setNeedsOrgRetry(false);
      setOrgRetryName('');
      setOrgRetryCredentials(null);
      setAuthViewState('login');
      setPhase('unauthenticated');
      setPending(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      phase,
      authView,
      setAuthView,
      pending,
      error,
      clearError,
      needsOrgRetry,
      login,
      register,
      logout,
    }),
    [
      phase,
      authView,
      setAuthView,
      pending,
      error,
      clearError,
      needsOrgRetry,
      login,
      register,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
