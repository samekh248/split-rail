import { fetchUserProfile } from '@/api/user';
import { apiFetch } from '@/api/client';
import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  AuthResponse,
  CreateOrganizationRequest,
  LoginRequest,
  OrganizationResponse,
  RefreshRequest,
  RegisterRequest,
  RegisterResponse,
  UserProfileResponse,
} from '@/types/generated-api';
import { clearTokens, getRefreshToken, setTokens } from './tokenStorage';

export class OrgCreationError extends Error {
  readonly profile: UserProfileResponse;

  constructor(profile: UserProfileResponse) {
    super('Account created, but we couldn\'t set up your organization. Please retry.');
    this.name = 'OrgCreationError';
    this.profile = profile;
  }
}

export function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('401')) {
    return 'Invalid email or password.';
  }
  if (message.includes('409')) {
    return 'An account with this email already exists.';
  }
  if (message.startsWith('400:')) {
    return message.replace(/^400:\s*/, '');
  }
  if (message.startsWith('403:')) {
    return message.replace(/^403:\s*/, '') || 'Access denied.';
  }
  if (message.startsWith('500:')) {
    const detail = message.replace(/^500:\s*/, '');
    if (detail && detail !== 'Internal Server Error') {
      return detail;
    }
    return 'The server could not complete your request. Check that the API and database are running, then try again.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (response.accessToken && response.refreshToken) {
    setTokens(response.accessToken, response.refreshToken);
  }
  return response;
}

export async function registerUser(request: RegisterRequest): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function refreshSession(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('401: No refresh token');
  }
  const body: RefreshRequest = { refreshToken };
  const response = await apiFetch<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuthRecovery: true,
  });
  if (response.accessToken && response.refreshToken) {
    setTokens(response.accessToken, response.refreshToken);
  }
  return response;
}

export async function createOrganization(name: string): Promise<OrganizationResponse> {
  const body: CreateOrganizationRequest = { name };
  return apiFetch<OrganizationResponse>('/organizations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function onboard(values: {
  email: string;
  password: string;
  organizationName: string;
}): Promise<UserProfileResponse> {
  await registerUser({ email: values.email, password: values.password });
  await login({ email: values.email, password: values.password });
  try {
    await createOrganization(values.organizationName);
  } catch {
    const profile = await fetchUserProfile();
    throw new OrgCreationError(profile);
  }
  await refreshSession();
  return fetchUserProfile();
}

/** @deprecated Use onboard() — kept for existing tests */
export async function registerWithOrganization(values: {
  email: string;
  password: string;
  organizationName: string;
}): Promise<void> {
  await onboard(values);
}

export async function completeOrganizationSetup(name: string): Promise<UserProfileResponse> {
  await createOrganization(name);
  await refreshSession();
  return fetchUserProfile();
}

export async function acceptInvitation(
  request: AcceptInvitationRequest,
): Promise<AcceptInvitationResponse> {
  const response = await apiFetch<AcceptInvitationResponse>('/invitations/accept', {
    method: 'POST',
    body: JSON.stringify(request),
    skipAuthRecovery: true,
    skipVenueContext: true,
  });
  if (response.accessToken && response.refreshToken) {
    setTokens(response.accessToken, response.refreshToken);
  }
  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' });
  } catch {
    /* best-effort */
  } finally {
    clearTokens();
  }
}
