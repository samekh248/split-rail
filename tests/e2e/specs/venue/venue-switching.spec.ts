import { test, expect } from '@playwright/test';
import { resetSeed } from '../../fixtures/seed';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? process.env.PREVIEW_BASE_URL;

async function login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(response.ok).toBeTruthy();
  return (await response.json()) as { accessToken: string; refreshToken: string };
}

async function seedAndLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  await resetSeed();
  return login(email, password);
}

test.describe('Venue switching (UI)', () => {
  test.skip(!WEB_BASE_URL, 'WEB_BASE_URL or PREVIEW_BASE_URL required for venue switching UI scenarios');

  test('full-access user sees all organization venues (E1)', async ({ page }) => {
    const { accessToken, refreshToken } = await seedAndLogin(
      'alpha-admin@e2e.test',
      'E2eTestPass1',
    );

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
      },
      { access: accessToken, refresh: refreshToken },
    );

    await page.goto('/');

    await expect(page.getByTestId('venue-switcher')).toBeVisible();
    await page.getByTestId('venue-switcher-trigger').click();
    await expect(page.getByRole('option', { name: /Alpha Main Hall/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Alpha Side Room/ })).toBeVisible();
  });

  test('scoped user sees only assigned venues (E2)', async ({ page }) => {
    const { accessToken, refreshToken } = await seedAndLogin(
      'alpha-scoped@e2e.test',
      'E2eTestPass1',
    );

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
      },
      { access: accessToken, refresh: refreshToken },
    );

    await page.goto('/');

    await expect(page.getByTestId('venue-switcher')).toBeVisible();
    await page.getByTestId('venue-switcher-trigger').click();
    await expect(page.getByRole('option', { name: /Alpha Main Hall/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Alpha Side Room/ })).not.toBeVisible();
  });

  test('selecting a venue updates ledger and sends X-Active-Venue-Id (E3)', async ({ page }) => {
    const seed = await resetSeed();
    const { accessToken, refreshToken } = await login('alpha-admin@e2e.test', 'E2eTestPass1');

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
      },
      { access: accessToken, refresh: refreshToken },
    );

    const capturedHeaders: string[] = [];
    await page.route('**/api/venues/*/events/**', async (route) => {
      const header = route.request().headers()['x-active-venue-id'];
      if (header) {
        capturedHeaders.push(header);
      }
      await route.continue();
    });

    await page.goto('/');

    await page.getByTestId('venue-switcher-trigger').click();
    await page.getByRole('option', { name: /Alpha Side Room/ }).click();

    await expect(page.getByTestId('venue-switcher-current')).toHaveText('Alpha Side Room');
    await expect
      .poll(() => capturedHeaders.includes(String(seed.orgA.outOfScopeVenueId)))
      .toBe(true);
  });

  test('out-of-scope venue activation is denied and active venue unchanged (E4)', async ({
    page,
    request,
  }) => {
    const seed = await resetSeed();
    const { accessToken, refreshToken } = await login('alpha-scoped@e2e.test', 'E2eTestPass1');

    const denied = await request.get(`/api/venues/${seed.orgA.outOfScopeVenueId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Active-Venue-Id': seed.orgA.outOfScopeVenueId,
      },
    });
    expect([403, 404]).toContain(denied.status());

    await page.addInitScript(
      ({ access, refresh, outOfScopeId }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        sessionStorage.setItem('activeVenueId', outOfScopeId);
      },
      {
        access: accessToken,
        refresh: refreshToken,
        outOfScopeId: seed.orgA.outOfScopeVenueId,
      },
    );

    await page.goto('/');

    await expect(page.getByTestId('venue-switcher-current')).toHaveText('Alpha Main Hall');
    await expect(page.getByRole('option', { name: /Alpha Side Room/ })).not.toBeVisible();
  });
});
