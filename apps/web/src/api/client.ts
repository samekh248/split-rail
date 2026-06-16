import { getAccessToken, getRefreshToken } from '@/auth/tokenStorage';
import { getActiveVenueId } from '@/venue/activeVenueStorage';

const API_BASE = '/api';

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export interface ApiFetchInit extends RequestInit {
  skipAuthRecovery?: boolean;
  isRetry?: boolean;
  skipVenueContext?: boolean;
}

interface ApiClientHandlers {
  onRefresh: () => Promise<void>;
  onSessionExpired: () => void;
}

let handlers: ApiClientHandlers | null = null;
let refreshInFlight: Promise<void> | null = null;
let sessionExpiredSignaled = false;

export function configureApiClient(config: ApiClientHandlers): void {
  handlers = config;
}

/** Resets the session-expired latch so a future unrecoverable session can signal again. */
export function resetSessionExpiredLatch(): void {
  sessionExpiredSignaled = false;
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function venueContextHeaders(skipVenueContext?: boolean): HeadersInit {
  if (skipVenueContext) {
    return {};
  }
  const venueId = getActiveVenueId();
  if (!venueId) {
    return {};
  }
  return { 'X-Active-Venue-Id': venueId };
}

function isAuthFailure(error: unknown): boolean {
  if (error instanceof SessionExpiredError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('401');
}

function isNetworkFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Failed to fetch') || message.includes('NetworkError');
}

function signalSessionExpired(): void {
  if (sessionExpiredSignaled) {
    return;
  }
  sessionExpiredSignaled = true;
  handlers?.onSessionExpired();
}

async function buildHttpError(response: Response): Promise<Error> {
  let detail = response.statusText;
  try {
    const body = (await response.json()) as {
      detail?: string;
      Detail?: string;
      title?: string;
      Title?: string;
    };
    detail = body.detail ?? body.Detail ?? body.title ?? body.Title ?? detail;
  } catch {
    /* ignore parse errors */
  }
  return new Error(`${response.status}: ${detail}`);
}

async function performRefresh(): Promise<void> {
  if (!handlers?.onRefresh) {
    throw new Error('401: API client not configured');
  }
  if (!refreshInFlight) {
    refreshInFlight = handlers.onRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  await refreshInFlight;
}

async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const { skipAuthRecovery, isRetry, skipVenueContext, ...requestInit } = init ?? {};

  const response = await fetch(`${API_BASE}${path}`, {
    ...requestInit,
    headers: {
      ...authHeaders(),
      ...venueContextHeaders(skipVenueContext),
      ...requestInit.headers,
    },
  });

  if (!response.ok) {
    if (response.status !== 401) {
      throw await buildHttpError(response);
    }

    if (skipAuthRecovery) {
      throw await buildHttpError(response);
    }

    if (isRetry) {
      signalSessionExpired();
      throw new SessionExpiredError();
    }

    if (!handlers?.onRefresh) {
      throw await buildHttpError(response);
    }

    if (!getRefreshToken()) {
      signalSessionExpired();
      throw new SessionExpiredError();
    }

    try {
      await performRefresh();
    } catch (error) {
      if (isNetworkFailure(error)) {
        throw error;
      }
      signalSessionExpired();
      throw new SessionExpiredError();
    }

    return apiFetch<T>(path, { ...init, isRetry: true });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function ledgerPath(venueId: string, eventId: string): string {
  return `/venues/${venueId}/events/${eventId}`;
}

export { apiFetch };
