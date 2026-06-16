import { test, expect } from '@playwright/test';
import { resetSeed } from '../../fixtures/seed';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

test.describe('Venue scope isolation', () => {
  test('Scoped user is denied access to out-of-scope venue', async ({ request }) => {
    const seed = await resetSeed();
    const token = await login(seed.orgA.scopedUserEmail, seed.orgA.scopedUserPassword);

    const response = await request.get(`/api/venues/${seed.orgA.outOfScopeVenueId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect([403, 404]).toContain(response.status());
    const body = await response.text();
    expect(body).not.toContain('Alpha Side Room');
  });
});
