import { test, expect, type Page } from '@playwright/test';
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

async function bootstrapDashboard(
  page: Page,
  tokens: { accessToken: string; refreshToken: string },
  sessionStorageSeed?: { activeVenueId?: string },
): Promise<void> {
  await page.addInitScript(
    ({ access, refresh, rememberedVenueId }) => {
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      if (rememberedVenueId) {
        sessionStorage.setItem('activeVenueId', rememberedVenueId);
      }
    },
    {
      access: tokens.accessToken,
      refresh: tokens.refreshToken,
      rememberedVenueId: sessionStorageSeed?.activeVenueId,
    },
  );

  await page.goto(`${WEB_BASE_URL}/`);
  await expect(page.getByTestId('venue-switcher')).toBeVisible({ timeout: 15_000 });
}

test.describe('Venue switching (UI)', () => {
  test.skip(!WEB_BASE_URL, 'WEB_BASE_URL or PREVIEW_BASE_URL required for venue switching UI scenarios');

  test('full-access user sees all organization venues (E1)', async ({ page }) => {
    const tokens = await seedAndLogin('alpha-admin@e2e.test', 'E2eTestPass1');
    await bootstrapDashboard(page, tokens);

    await page.getByTestId('venue-switcher-trigger').click();
    await expect(page.getByRole('option', { name: /Alpha Main Hall/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Alpha Side Room/ })).toBeVisible();
  });

  test('scoped user sees only assigned venues (E2)', async ({ page }) => {
    const tokens = await seedAndLogin('alpha-scoped@e2e.test', 'E2eTestPass1');
    await bootstrapDashboard(page, tokens);

    await expect(page.getByTestId('venue-switcher-current')).toHaveText('Alpha Main Hall');
    await expect(page.getByTestId('venue-switcher')).toHaveClass(/venue-switcher--single/);
    await expect(page.getByTestId('venue-switcher-trigger')).toHaveCount(0);
  });

  test('selecting a venue updates ledger and sends X-Active-Venue-Id (E3)', async ({ page }) => {
    const seed = await resetSeed();
    const tokens = await login('alpha-admin@e2e.test', 'E2eTestPass1');

    const capturedHeaders: string[] = [];
    await page.route('**/api/venues/*/events/**', async (route) => {
      const header = route.request().headers()['x-active-venue-id'];
      if (header) {
        capturedHeaders.push(header);
      }
      await route.continue();
    });

    await bootstrapDashboard(page, tokens);
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
    const tokens = await login('alpha-scoped@e2e.test', 'E2eTestPass1');

    const denied = await request.get(`/api/venues/${seed.orgA.outOfScopeVenueId}`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'X-Active-Venue-Id': seed.orgA.outOfScopeVenueId,
      },
    });
    expect([403, 404]).toContain(denied.status());

    await bootstrapDashboard(page, tokens, {
      activeVenueId: seed.orgA.outOfScopeVenueId,
    });

    await expect(page.getByTestId('venue-switcher-current')).toHaveText('Alpha Main Hall');
    await expect(page.getByRole('option', { name: /Alpha Side Room/ })).toHaveCount(0);
  });
});
