import { fetchUserProfile } from '@/api/user';
import type { UserProfileResponse } from '@/types/generated-api';
import { refreshSession } from './authApi';
import { clearTokens, getAccessToken, getRefreshToken } from './tokenStorage';
import type { AuthPhase } from './AuthContext';

export function routeProfile(profile: UserProfileResponse): AuthPhase {
  return profile.organization != null ? 'authenticated' : 'needs-organization';
}

export interface BootstrapResult {
  profile: UserProfileResponse | null;
  phase: AuthPhase;
}

export async function bootstrapAuthSession(): Promise<BootstrapResult> {
  const token = getAccessToken();
  if (!token) {
    return { profile: null, phase: 'unauthenticated' };
  }

  try {
    const profile = await fetchUserProfile();
    return { profile, phase: routeProfile(profile) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('401')) {
      clearTokens();
      return { profile: null, phase: 'unauthenticated' };
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return { profile: null, phase: 'unauthenticated' };
    }

    try {
      await refreshSession();
      const profile = await fetchUserProfile();
      return { profile, phase: routeProfile(profile) };
    } catch {
      clearTokens();
      return { profile: null, phase: 'unauthenticated' };
    }
  }
}
