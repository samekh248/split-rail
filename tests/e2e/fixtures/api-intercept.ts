import type { APIRequestContext } from '@playwright/test';

export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export function bodyContainsSentinel(body: string, sentinels: string[]): string[] {
  const leaked: string[] = [];
  for (const sentinel of sentinels) {
    if (body.includes(sentinel)) leaked.push(sentinel);
  }
  return leaked;
}

export async function apiRequestWithToken(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; body: string }> {
  const response = await request.fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: body,
  });
  const text = await response.text();
  return { status: response.status(), body: text };
}

export function swapIdsInPath(path: string, fromId: string, toId: string): string {
  return path.split(fromId).join(toId);
}
