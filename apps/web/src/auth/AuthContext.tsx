import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { configureApiClient, resetSessionExpiredLatch } from '@/api/client';
import { fetchUserProfile } from '@/api/user';
import type { LoginRequest, UserProfileResponse } from '@/types/generated-api';
import { clearActiveVenueId } from '@/venue/activeVenueStorage';
import { bootstrapAuthSession, routeProfile } from './authBootstrap';
import * as authApi from './authApi';

export type AuthPhase = 'resolving' | 'unauthenticated' | 'needs-organization' | 'authenticated';
export type AuthView = 'login' | 'register';

export interface RegisterValues {
  email: string;
  password: string;
  organizationName: string;
}

export interface AuthContextValue {
  phase: AuthPhase;
  profile: UserProfileResponse | null;
  justOnboarded: boolean;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  pending: boolean;
  error: string | null;
  sessionExpired: boolean;
  clearError: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  onboard: (values: RegisterValues) => Promise<void>;
  /** @deprecated Use onboard */
  register: (values: RegisterValues) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  dismissWelcome: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<AuthPhase>('resolving');
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [justOnboarded, setJustOnboarded] = useState(false);
  const [authView, setAuthViewState] = useState<AuthView>('login');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleAutomaticSignOut = useCallback(() => {
    void (async () => {
      try {
        await authApi.logout();
      } catch {
        /* best-effort */
      }
      queryClient.clear();
      clearActiveVenueId();
      setProfile(null);
      setJustOnboarded(false);
      setAuthViewState('login');
      setPhase('unauthenticated');
      setSessionExpired(true);
    })();
  }, [queryClient]);

  useEffect(() => {
    configureApiClient({
      onRefresh: () => authApi.refreshSession(),
      onSessionExpired: handleAutomaticSignOut,
    });
  }, [handleAutomaticSignOut]);

  useEffect(() => {
    let cancelled = false;
    void bootstrapAuthSession().then((result) => {
      if (cancelled) return;
      setProfile(result.profile);
      setPhase(result.phase);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const setAuthView = useCallback((view: AuthView) => {
    setAuthViewState(view);
    setError(null);
  }, []);

  const dismissWelcome = useCallback(() => setJustOnboarded(false), []);

  const login = useCallback(async (credentials: LoginRequest) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await authApi.login(credentials);
      const loadedProfile = await fetchUserProfile();
      setProfile(loadedProfile);
      setJustOnboarded(false);
      setSessionExpired(false);
      resetSessionExpiredLatch();
      setPhase(routeProfile(loadedProfile));
    } catch (err) {
      setError(authApi.mapAuthError(err));
      throw err;
    } finally {
      setPending(false);
    }
  }, [pending]);

  const onboard = useCallback(
    async (values: RegisterValues) => {
      if (pending) return;
      setPending(true);
      setError(null);
      try {
        const loadedProfile = await authApi.onboard(values);
        setProfile(loadedProfile);
        setJustOnboarded(true);
        setSessionExpired(false);
        resetSessionExpiredLatch();
        setPhase('authenticated');
      } catch (err) {
        if (err instanceof authApi.OrgCreationError) {
          setProfile(err.profile);
          setPhase('needs-organization');
          setError(err.message);
          return;
        }
        setError(authApi.mapAuthError(err));
        throw err;
      } finally {
        setPending(false);
      }
    },
    [pending],
  );

  const createOrganization = useCallback(
    async (name: string) => {
      if (pending) return;
      setPending(true);
      setError(null);
      try {
        const loadedProfile = await authApi.completeOrganizationSetup(name);
        setProfile(loadedProfile);
        setJustOnboarded(true);
        setSessionExpired(false);
        resetSessionExpiredLatch();
        setPhase('authenticated');
      } catch (err) {
        setError(authApi.mapAuthError(err));
        throw err;
      } finally {
        setPending(false);
      }
    },
    [pending],
  );

  const logout = useCallback(async () => {
    setPending(true);
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      clearActiveVenueId();
      setProfile(null);
      setJustOnboarded(false);
      setSessionExpired(false);
      resetSessionExpiredLatch();
      setAuthViewState('login');
      setPhase('unauthenticated');
      setPending(false);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      phase,
      profile,
      justOnboarded,
      authView,
      setAuthView,
      pending,
      error,
      sessionExpired,
      clearError,
      login,
      onboard,
      register: onboard,
      createOrganization,
      logout,
      dismissWelcome,
    }),
    [
      phase,
      profile,
      justOnboarded,
      authView,
      setAuthView,
      pending,
      error,
      sessionExpired,
      clearError,
      login,
      onboard,
      createOrganization,
      logout,
      dismissWelcome,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
